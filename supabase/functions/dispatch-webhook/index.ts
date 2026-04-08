import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, event, payload } = await req.json();

    if (!user_id || !event || !payload) {
      return new Response(JSON.stringify({ error: 'Missing user_id, event, or payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[dispatch-webhook] user=${user_id} event=${event}`);

    // Fetch active webhooks for this user that subscribe to this event
    const { data: webhooks, error: whError } = await admin
      .from('webhooks')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (whError) {
      console.error('[dispatch-webhook] Error fetching webhooks:', whError);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhooks' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter webhooks that subscribe to this event
    const matching = (webhooks || []).filter((wh: any) => {
      const events = Array.isArray(wh.events) ? wh.events : [];
      return events.includes(event);
    });

    console.log(`[dispatch-webhook] Found ${matching.length} matching webhooks for event ${event}`);

    const results = [];

    for (const wh of matching) {
      let lastStatus: number | null = null;
      let lastBody = '';
      let success = false;

      // HMAC signature
      const encoder = new TextEncoder();
      const keyData = encoder.encode(wh.secret);
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const bodyStr = JSON.stringify({ event, ...payload });
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr));
      const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      const signature = `sha256=${sigHex}`;

      // Up to 3 attempts with backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const resp = await fetch(wh.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Treex-Signature': signature,
              'X-Webhook-ID': wh.id,
              'User-Agent': 'TreexPay-Webhook/1.0',
            },
            body: bodyStr,
            signal: controller.signal,
          });

          clearTimeout(timeout);
          lastStatus = resp.status;
          lastBody = await resp.text().catch(() => '');

          // Log this attempt
          await admin.from('webhook_logs').insert({
            webhook_id: wh.id,
            event,
            payload: { event, ...payload },
            response_status: lastStatus,
            response_body: lastBody.substring(0, 1000),
            attempt,
          });

          if (resp.ok) {
            success = true;
            console.log(`[dispatch-webhook] ✓ ${wh.url} attempt=${attempt} status=${lastStatus}`);
            break;
          }

          console.warn(`[dispatch-webhook] ✗ ${wh.url} attempt=${attempt} status=${lastStatus}`);
        } catch (err: any) {
          lastBody = err.message || 'timeout/error';
          console.error(`[dispatch-webhook] ✗ ${wh.url} attempt=${attempt} error=${err.message}`);

          await admin.from('webhook_logs').insert({
            webhook_id: wh.id,
            event,
            payload: { event, ...payload },
            response_status: null,
            response_body: lastBody.substring(0, 1000),
            attempt,
          });
        }

        // Backoff: 1s, 3s
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }

      results.push({ webhook_id: wh.id, url: wh.url, success, last_status: lastStatus });
    }

    return new Response(JSON.stringify({ dispatched: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[dispatch-webhook] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
