
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS TABLE(
    user_id uuid,
    total_volume numeric,
    last_sale_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH all_sales AS (
        -- Vendas de depósitos concluídos
        SELECT
            d.user_id,
            d.amount,
            d.created_at AS sale_date
        FROM public.deposits AS d
        WHERE d.status = 'completed'::public.deposit_status
          AND d.created_at BETWEEN p_start_date AND p_end_date

        UNION ALL

        -- Vendas de pagamentos de checkout concluídos
        SELECT
            c.user_id,
            cp.amount,
            cp.created_at AS sale_date
        FROM public.checkout_payments AS cp
        JOIN public.checkouts AS c ON cp.checkout_id = c.id
        WHERE cp.status = 'paid'
          AND cp.created_at BETWEEN p_start_date AND p_end_date
    )
    SELECT
        s.user_id,
        SUM(s.amount) AS total_volume,
        MAX(s.sale_date) AS last_sale_date
    FROM all_sales s
    WHERE s.user_id IS NOT NULL
    GROUP BY s.user_id;
END;
$$;
