import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

// --- API Key Authentication Middleware ---
const authenticateWithApiKey = async (req: Request, supabaseAdmin: SupabaseClient) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { message: 'Missing or invalid authorization header' }, status: 401 }
  }
  const apiKey = authHeader.replace('Bearer ', '')

  // The prefix is a fixed-length, non-secret part of the key.
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

  // On successful auth, return the user_id
  return { user_id: apiKeyData.user_id }
}

// --- Helper to Generate a new API Key ---
const generateApiKey = async (supabaseAdmin: SupabaseClient, userId: string) => {
  await supabaseAdmin
    .from('api_keys')
    .update({ status: 'revoked' })
    .eq('user_id', userId)
    .eq('status', 'active')

  const newKey = `tp_live_${crypto.randomUUID().replaceAll('-', '')}`
  const prefix = newKey.substring(0, 16)

  const encoder = new TextEncoder()
  const hashedKey = await crypto.subtle.digest('SHA-256', encoder.encode(newKey))
  const hashedKeyHex = Array.from(new Uint8Array(hashedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({ user_id: userId, key_prefix: prefix, key_hash: hashedKeyHex })
    .select('id, key_prefix, status, created_at')
    .single()

  if (error) {
    console.error('Error saving new API key:', error);
    throw new Error('Failed to save new API key')
  }

  // Return the full key, it will only be shown once.
  return { ...data, api_key: newKey }
}

// --- Helper to validate CPF ---
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const { pathname, searchParams } = url
    const supabaseAdmin = getSupabaseAdmin()

    // --- API ROUTER ---

    // Endpoint: Manage API Keys (Requires User JWT Auth)
    if (pathname.endsWith('/api-v1/auth/api-key')) {
      const supabase = getSupabaseClient(req)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin
          .from('api_keys')
          .select('id, key_prefix, status, created_at, last_used_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        if (error) throw error
        return new Response(JSON.stringify(data || null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      if (req.method === 'POST') {
        const newKeyData = await generateApiKey(supabaseAdmin, user.id)
        return new Response(JSON.stringify(newKeyData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      if (req.method === 'DELETE') {
        const { error } = await supabaseAdmin
          .from('api_keys')
          .update({ status: 'revoked' })
          .eq('user_id', user.id)
          .eq('status', 'active')
        if (error) throw error
        return new Response(JSON.stringify({ message: 'API key revoked' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }
    }

    // --- All other endpoints require API Key Authentication ---
    const authResult = await authenticateWithApiKey(req, supabaseAdmin)
    if (authResult.error) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: authResult.status,
      })
    }
    const { user_id } = authResult

    // On successful auth, update last_used_at
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('status', 'active');

    // Endpoint: Get User Info
    if (pathname.endsWith('/api-v1/user') && req.method === 'GET') {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, balance, created_at')
        .eq('id', user_id)
        .single()
      if (error) throw error
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }
    
    // --- Balance Endpoint ---
    if (pathname.endsWith('/api-v1/balance') && req.method === 'GET') {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('balance')
            .eq('id', user_id)
            .single()
        if (error) {
            console.error('Balance fetch error:', error)
            throw new Error('Could not fetch user balance')
        }
        return new Response(JSON.stringify(profile), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
    }

    // --- Transactions Endpoint ---
    if (pathname.endsWith('/api-v1/transactions') && req.method === 'GET') {
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');
        const type = searchParams.get('type');

        let query = supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);
        
        const { data, error } = await query;
        if (error) throw error;
        
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
    }

    // --- PIX Endpoints ---
    const pixIdMatch = pathname.match(/\/api-v1\/pix\/([a-fA-F0-9-]{36})$/);
    if (pixIdMatch && req.method === 'GET') {
      const depositId = pixIdMatch[1];
      const { data, error } = await supabaseAdmin
          .from('deposits')
          .select('id, amount, status, created_at')
          .eq('id', depositId)
          .eq('user_id', user_id) // Security check
          .single();

      if (error || !data) {
          return new Response(JSON.stringify({ error: 'Deposit not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
          });
      }
      return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    } else if (pathname.endsWith('/api-v1/pix')) {
      if (req.method === 'GET') {
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        const { data, error } = await supabaseAdmin
            .from('deposits')
            .select('id, amount, status, created_at, qr_code')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
      if (req.method === 'POST') {
        const { amount } = await req.json();

        const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL');
        const NOVAERA_PK = Deno.env.get('NOVAERA_PK');
        const NOVAERA_SK = Deno.env.get('NOVAERA_SK');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

        if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK || !SUPABASE_URL) {
          console.error('API credentials for NovaEra or Supabase URL are not configured');
          throw new Error('Internal server configuration error');
        }

        if (!amount || amount <= 0 || amount > 50000) {
          return new Response(JSON.stringify({ error: 'Invalid amount. Must be between 0.01 and 50000.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    }

    // --- Withdrawal Endpoint ---
    if (pathname.endsWith('/api-v1/withdraw') && req.method === 'POST') {
      const { amount, pixType, pixKey } = await req.json();

      if (!amount || amount <= 0 || !pixType || !pixKey) {
          return new Response(JSON.stringify({ error: 'Missing required fields: amount, pixType, pixKey' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // --- Webhooks Endpoints ---
    if (pathname.endsWith('/api-v1/webhooks')) {
        if (req.method === 'GET') {
            const { data, error } = await supabaseAdmin.from('user_webhooks').select('id, url, is_active, created_at, updated_at').eq('user_id', user_id).maybeSingle();
            if (error) throw error;
            return new Response(JSON.stringify(data || null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
        if (req.method === 'POST' || req.method === 'PUT') {
            const { url: webhookUrl } = await req.json();
            if (!webhookUrl || !webhookUrl.startsWith('https://')) {
                return new Response(JSON.stringify({ error: 'Invalid webhook URL. Must start with https://' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
            }
            const secret = `whsec_${crypto.randomUUID().replaceAll('-', '')}`;

            const { data, error } = await supabaseAdmin.from('user_webhooks').upsert({ user_id: user_id, url: webhookUrl, secret: secret, is_active: true }, { onConflict: 'user_id' }).select('id, url, secret, is_active').single();
            if (error) throw error;
            // The secret is returned only upon creation/update.
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
    }

    return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
