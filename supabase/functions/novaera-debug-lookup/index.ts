import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL')!
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK')!
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK')!
    const supabase = createClient(SUPABASE_URL, SRK)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'no auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Only allow admin
    const { data: prof } = await supabase.from('profiles').select('profile').eq('id', user.id).single()
    if (prof?.profile !== 'admin') return new Response(JSON.stringify({ error: 'admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json().catch(() => ({}))
    const externalRef: string = body?.externalRef || ''

    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`)
    const base = NOVAERA_BASE_URL.replace(/\/$/, '')

    const urls = [
      `${base}/transactions?externalRef=${encodeURIComponent(externalRef)}`,
      `${base}/transactions?search=${encodeURIComponent(externalRef)}`,
      `${base}/transactions?filter[externalRef]=${encodeURIComponent(externalRef)}`,
      `${base}/transactions?perPage=20&page=1`,
    ]
    const results: any[] = []
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' } })
        const txt = await r.text()
        results.push({ url, status: r.status, body: txt.slice(0, 1500) })
      } catch (e: any) {
        results.push({ url, error: e.message })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
