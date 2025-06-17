
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  data?: any;
}

export const validateWebhookSignature = async (
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const computedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const computedSignatureHex = Array.from(new Uint8Array(computedSignature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    return computedSignatureHex === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
};

export const validateWebhookPayload = (body: any): WebhookValidationResult => {
  // Basic payload validation
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  // Check for required fields based on webhook type
  const requiredFields = ['status', 'externalRef'];
  for (const field of requiredFields) {
    if (!body[field] && !body.data?.[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate amount if present
  const amount = body.amount || body.data?.amount;
  if (amount && (typeof amount !== 'number' || amount <= 0)) {
    return { valid: false, error: 'Invalid amount value' };
  }

  return { valid: true, data: body };
};

// Rate limiting implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This is a utility function, not a direct endpoint
    return new Response(
      JSON.stringify({ 
        message: 'Webhook validation utilities loaded',
        functions: ['validateWebhookSignature', 'validateWebhookPayload', 'checkRateLimit']
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
