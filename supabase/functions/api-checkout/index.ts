
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CheckoutRequest {
  userId: string;
  productName: string;
  productValue: number;
  taxPercentage?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { userId, productName, productValue, taxPercentage = 10 } = body;

    // Validate required fields
    if (!userId || !productName || !productValue) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId, productName, productValue' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate productValue
    if (typeof productValue !== 'number' || productValue <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'productValue must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate taxPercentage
    if (typeof taxPercentage !== 'number' || taxPercentage < 0 || taxPercentage > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'taxPercentage must be between 0 and 100' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user exists
    const { data: userExists, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userExists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique checkout slug
    const { data: slugData, error: slugError } = await supabase
      .rpc('generate_checkout_slug');

    if (slugError) {
      console.error('Error generating checkout slug:', slugError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate checkout ID' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const checkoutSlug = slugData;

    // Create checkout in database
    const { data: checkout, error: insertError } = await supabase
      .from('checkouts')
      .insert({
        user_id: userId,
        title: productName,
        amount: productValue,
        url_slug: checkoutSlug,
        active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating checkout:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create checkout' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the origin from the request or use the Referer header
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const checkoutUrl = origin ? `${origin}/checkout/${checkoutSlug}` : `/checkout/${checkoutSlug}`;

    console.log(`Created checkout with URL: ${checkoutUrl}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        checkoutId: checkout.id,
        checkoutSlug: checkoutSlug,
        checkoutUrl: checkoutUrl,
        productName: productName,
        productValue: productValue,
        taxPercentage: taxPercentage
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in api-checkout:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
