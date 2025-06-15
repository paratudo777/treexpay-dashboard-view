
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const { pathname } = url
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

    // Endpoint: Get User Info (Requires API Key Auth)
    if (pathname.endsWith('/api-v1/user')) {
      const authResult = await authenticateWithApiKey(req, supabaseAdmin)
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: authResult.status,
        })
      }

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, balance, created_at')
        .eq('id', authResult.user_id)
        .single()
      if (error) throw error
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
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
