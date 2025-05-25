
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('Webhook NovaEra PIX recebido:', JSON.stringify(body, null, 2));

    // Verificar se é um pagamento PIX aprovado
    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada";

    if (!isApproved) {
      console.log('Webhook ignorado - não é um pagamento aprovado. Status:', body?.status);
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Buscar referência/ID da transação
    const transactionRef = body?.externalRef || 
                          body?.externalId ||
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id;

    if (!transactionRef) {
      console.error('Referência da transação não encontrada no webhook NovaEra PIX');
      throw new Error('Transaction reference not found');
    }

    console.log('Processando pagamento PIX aprovado para referência:', transactionRef);

    // Atualizar depósito para completed
    const { data: depositData, error: depositError } = await supabase
      .from("deposits")
      .update({ status: "completed" })
      .or(`qr_code.eq.${body.pix?.qrcodeText || body.pix?.qrcode || ''},id.eq.${transactionRef}`)
      .select();

    if (depositError) {
      console.error('Erro ao atualizar depósito:', depositError);
    } else if (depositData && depositData.length > 0) {
      console.log('Depósito atualizado:', depositData[0]);
      
      const deposit = depositData[0];
      
      // Atualizar transação correspondente
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', deposit.user_id)
        .eq('type', 'deposit')
        .eq('amount', deposit.amount)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (transactionError) {
        console.error('Erro ao atualizar transação:', transactionError);
      } else {
        console.log('Transação atualizada para aprovado');
      }

      // Atualizar saldo do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', deposit.user_id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil do usuário:', profileError);
      } else {
        const newBalance = (profile.balance || 0) + deposit.amount;
        
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', deposit.user_id);

        if (balanceError) {
          console.error('Erro ao atualizar saldo:', balanceError);
        } else {
          console.log(`Saldo atualizado para usuário ${deposit.user_id}: ${newBalance}`);
        }
      }
    } else {
      console.log('Nenhum depósito encontrado para atualizar');
    }

    return new Response("webhook processed", { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Erro no webhook NovaEra PIX:', error);
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
