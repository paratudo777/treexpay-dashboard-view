
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NovaEraStatusResponse {
  status: string;
}

interface NovaEraTransactionResponse {
  data: {
    status: string;
    id?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL');
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK');
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK');

    if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK) {
      throw new Error('NovaEra API credentials not configured');
    }

    // Create basic auth header
    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    console.log('Starting NovaEra payment test flow...');

    // Step 1: Check API status
    console.log('Checking NovaEra API status...');
    const statusResponse = await fetch(`${NOVAERA_BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    const statusData: NovaEraStatusResponse = await statusResponse.json();
    console.log('API Status:', statusData.status);

    if (statusData.status !== 'online') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'API offline',
          status: statusData.status 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503
        }
      );
    }

    // Step 2: Tokenize test card
    console.log('Tokenizing test card...');
    const tokenizeResponse = await fetch(`${NOVAERA_BASE_URL}/card-token?publicKey=${NOVAERA_PK}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "number": "4111111111111111",
        "holderName": "JOAO DA SILVA",
        "expirationMonth": "12",
        "expirationYear": "2030",
        "cvv": "123"
      }),
    });

    if (!tokenizeResponse.ok) {
      throw new Error(`Card tokenization failed: ${tokenizeResponse.status}`);
    }

    const cardToken = await tokenizeResponse.text();
    console.log('Card tokenized successfully');

    // Step 3: Create test transaction
    console.log('Creating test transaction...');
    const externalRef = `pedido_teste_${Date.now()}`;
    
    const transactionResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "paymentMethod": "credit_card",
        "amount": 1000,
        "installments": "1",
        "ip": "192.168.0.1",
        "items": [
          { "title": "Compra-Teste", "unitPrice": 1000, "quantity": 1, "tangible": false }
        ],
        "externalRef": externalRef,
        "postbackUrl": "https://webhook.site/test",
        "traceable": false,
        "card": { "hash": cardToken },
        "customer": {
          "name": "Maria Teste",
          "email": "maria.teste@example.com",
          "phone": "11999998888",
          "document": { "type": "cpf", "number": "12345678900" }
        }
      }),
    });

    if (!transactionResponse.ok) {
      throw new Error(`Transaction creation failed: ${transactionResponse.status}`);
    }

    const transactionData: NovaEraTransactionResponse = await transactionResponse.json();
    console.log('Transaction created:', transactionData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction: transactionData,
        externalRef 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('NovaEra payment test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
