
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Usuário autenticado:', user.id)

    const { userId, amount, pixType, pixKey } = await req.json()

    // Validações
    if (!userId || userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID de usuário inválido' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valor inválido' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!pixType || !pixKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados PIX incompletos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar saldo do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Erro ao buscar perfil:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (profile.balance < amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Saldo insuficiente' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Gerar código único para a transação
    const generateCode = () => {
      return 'TXN' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + 
             Math.floor(Math.random() * 999999).toString().padStart(6, '0')
    }

    let code = generateCode()
    
    // Verificar se o código já existe
    let { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('code', code)
      .single()

    while (existingTransaction) {
      code = generateCode()
      const { data: checkAgain } = await supabase
        .from('transactions')
        .select('id')
        .eq('code', code)
        .single()
      existingTransaction = checkAgain
    }

    // Criar solicitação de saque
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount: amount,
        pix_key_type: pixType,
        pix_key: pixKey,
        status: 'requested'
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('Erro ao criar solicitação de saque:', withdrawalError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar solicitação' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Criar transação
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        code: code,
        user_id: userId,
        type: 'withdrawal',
        description: `Saque PIX solicitado – R$ ${amount.toFixed(2)}`,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao criar transação:', transactionError)
      
      // Reverter criação do withdrawal se a transação falhar
      await supabase
        .from('withdrawals')
        .delete()
        .eq('id', withdrawal.id)

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar transação' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Saque criado com sucesso:', { withdrawalId: withdrawal.id, transactionId: transaction.id })

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawalId: withdrawal.id,
        transactionId: transaction.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
