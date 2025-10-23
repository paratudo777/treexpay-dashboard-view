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
    
    return computedSignatureHex === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
};

export const validateWebhookPayload = (body: any): WebhookValidationResult => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  const requiredFields = ['status', 'externalRef'];
  for (const field of requiredFields) {
    if (!body[field] && !body.data?.[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  const amount = body.amount || body.data?.amount;
  if (amount && (typeof amount !== 'number' || amount <= 0)) {
    return { valid: false, error: 'Invalid amount value' };
  }

  return { valid: true, data: body };
};

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
