import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Enhanced rate limiting with Redis-like functionality
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(identifier);

  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (rateLimitData.count >= maxRequests) {
    return false;
  }

  rateLimitData.count++;
  return true;
};

// Input validation and sanitization
const validateAndSanitizeInput = (data: any): { isValid: boolean; sanitizedData?: any; error?: string } => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid input format' };
  }

  const sanitizedData: any = {};

  // Sanitize string inputs
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      sanitizedData[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    } else if (typeof value === 'number') {
      // Validate numeric inputs
      if (isNaN(value) || !isFinite(value)) {
        return { isValid: false, error: `Invalid numeric value for ${key}` };
      }
      sanitizedData[key] = value;
    } else {
      sanitizedData[key] = value;
    }
  }

  return { isValid: true, sanitizedData };
};

// Enhanced error handling
const handleSecureError = (error: any, context: string): Response => {
  console.error(`Error in ${context}:`, error);
  
  // Filter sensitive information from error messages
  let message = 'Internal server error';
  
  if (error.message) {
    const sensitivePatterns = [/password/i, /token/i, /key/i, /secret/i];
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(error.message));
    
    if (!isSensitive) {
      message = error.message;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message,
      code: 'INTERNAL_ERROR'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    }
  );
};

// Request size validation
const validateRequestSize = (req: Request): boolean => {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    return false;
  }
  return true;
};

// Helper to create a Supabase admin client (bypasses RLS)
const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not set.')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

// Helper to create a Supabase client using the user's JWT
const getSupabaseClient = (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
}

// Enhanced API Key Authentication with rate limiting
const authenticateWithApiKey = async (req: Request, supabaseAdmin: SupabaseClient) => {
  const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limit by IP
  if (!checkRateLimit(`auth_${clientIP}`, 20, 60000)) {
    return { error: { message: 'Rate limit exceeded' }, status: 429 }
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { message: 'Missing or invalid authorization header' }, status: 401 }
  }
  
  const apiKey = authHeader.replace('Bearer ', '')

  // Input validation for API key format
  if (apiKey.length < 16 || apiKey.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    return { error: { message: 'Invalid API key format' }, status: 403 }
  }

  const prefix = apiKey.substring(0, 16)

  const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, key_hash, status')
    .eq('key_prefix', prefix)
    .single()

  if (apiKeyError || !apiKeyData) {
    return { error: { message: 'API key not found' }, status: 403 }
  }

  if (apiKeyData.status !== 'active') {
    return { error: { message: 'API key is not active' }, status: 403 }
  }

  const encoder = new TextEncoder()
  const hashedKey = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
  const hashedKeyHex = Array.from(new Uint8Array(hashedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (hashedKeyHex !== apiKeyData.key_hash) {
    return { error: { message: 'Invalid API key' }, status: 403 }
  }

  return { user_id: apiKeyData.user_id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Request size validation
    if (!validateRequestSize(req)) {
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 413
        }
      );
    }

    const url = new URL(req.url)
    const { pathname, searchParams } = url
    const supabaseAdmin = getSupabaseAdmin()

    // Enhanced rate limiting by endpoint
    const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}_${pathname}`;
    
    if (!checkRateLimit(rateLimitKey, 30, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded for this endpoint' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    // API Key Authentication required for all endpoints except auth
    if (!pathname.endsWith('/api-v1/auth/api-key')) {
      const authResult = await authenticateWithApiKey(req, supabaseAdmin)
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: authResult.status,
        })
      }

      const { user_id } = authResult

      // Update last_used_at with error handling
      try {
        await supabaseAdmin
          .from('api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'active');
      } catch (error) {
        console.error('Failed to update API key last_used_at:', error);
      }

      // Enhanced endpoint handlers with input validation
      if (pathname.endsWith('/api-v1/pix') && req.method === 'POST') {
        const requestData = await req.json();
        const validation = validateAndSanitizeInput(requestData);
        
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }

        const { amount } = validation.sanitizedData!;

        // Enhanced amount validation
        if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 50000) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount. Must be between 0.01 and 50000.' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }

        const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL');
        const NOVAERA_PK = Deno.env.get('NOVAERA_PK');
        const NOVAERA_SK = Deno.env.get('NOVAERA_SK');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

        if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK || !SUPABASE_URL) {
          console.error('API credentials for NovaEra or Supabase URL are not configured');
          throw new Error('Internal server configuration error');
        }

        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('name, email, cpf, phone').eq('id', user_id).single();
        if (profileError || !profile) throw new Error('User profile not found');
        if (!profile.cpf || !isValidCpf(profile.cpf)) {
            return new Response(JSON.stringify({ error: 'User profile is incomplete or CPF is invalid. Please update your profile.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }

        const { data: depositData, error: depositError } = await supabaseAdmin.from('deposits').insert({ user_id: user_id, amount: Number(amount), status: 'waiting' }).select().single();
        if (depositError) throw depositError;

        const externalRef = `deposit_${depositData.id}`;
        const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
        const authHeader = `Basic ${credentials}`;

        const pixResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: "pix", amount: amount * 100, externalRef, postbackUrl: `${SUPABASE_URL}/functions/v1/novaera-pix-webhook`,
            pix: { pixKey: "treex@tecnologia.com.br", pixKeyType: "email", expiresInSeconds: 3600 },
            items: [{ title: "Cobrança API", quantity: 1, tangible: false, unitPrice: amount * 100 }],
            customer: { name: profile.name, email: profile.email, phone: profile.phone || "5511999999999", document: { type: "cpf", number: profile.cpf } },
            notifications: { email: false, sms: false }
          }),
        });

        if (!pixResponse.ok) {
          const errorBody = await pixResponse.text();
          console.error('PIX creation failed:', errorBody);
          throw new Error(`PIX creation failed: ${pixResponse.status}`);
        }
        const pixData = await pixResponse.json();

        const { error: updateError } = await supabaseAdmin.from('deposits').update({ qr_code: pixData.data.pix.qrcodeText, pix_key: "treex@tecnologia.com.br", receiver_name: "Treex Tecnologia" }).eq('id', depositData.id);
        if (updateError) console.error("Failed to save QR Code text", updateError);

        return new Response(JSON.stringify({ id: depositData.id, status: depositData.status, amount: depositData.amount, qr_code_text: pixData.data.pix.qrcodeText, qr_code_image_base64: pixData.data.pix.qrcode }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
      }

      // Enhanced withdraw endpoint with validation
      if (pathname.endsWith('/api-v1/withdraw') && req.method === 'POST') {
        const requestData = await req.json();
        const validation = validateAndSanitizeInput(requestData);
        
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }

        const { amount, pixType, pixKey } = validation.sanitizedData!;

        // Enhanced validation
        if (!amount || !pixType || !pixKey) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: amount, pixType, pixKey' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }

        // PIX key format validation
        const pixKeyTypes = ['email', 'phone', 'cpf', 'cnpj', 'random'];
        if (!pixKeyTypes.includes(pixType)) {
          return new Response(
            JSON.stringify({ error: 'Invalid PIX key type' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }

        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('balance').eq('id', user_id).single();
        if (profileError) throw profileError;

        if (profile.balance < amount) {
            return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: withdrawal, error: withdrawalError } = await supabaseAdmin.from('withdrawals').insert({ user_id: user_id, amount: amount, pix_key_type: pixType, pix_key: pixKey, status: 'requested' }).select().single();
        if (withdrawalError) throw withdrawalError;

        // This logic is from the old `api-withdraw` function. A trigger would be better.
        const code = 'WTH' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + Math.floor(Math.random() * 999999).toString().padStart(6, '0');

        const { data: transaction, error: transactionError } = await supabaseAdmin.from('transactions').insert({ code: code, user_id: user_id, type: 'withdrawal', description: `API Withdrawal Request - R$ ${Number(amount).toFixed(2)}`, amount: amount, status: 'pending' }).select('id').single();
        if (transactionError) {
            await supabaseAdmin.from('withdrawals').delete().eq('id', withdrawal.id);
            throw transactionError;
        }

        return new Response(JSON.stringify({ success: true, withdrawalId: withdrawal.id, transactionId: transaction.id }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })

  } catch (error) {
    return handleSecureError(error, 'enhanced-api-v1');
  }
})

// Helper to validate CPF
function isValidCpf(cpf: string): boolean {
  if (typeof cpf !== 'string') return false
  cpf = cpf.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let sum = 0
  let rest
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf.substring(9, 10))) return false
  sum = 0
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf.substring(10, 11))) return false
  return true
}
