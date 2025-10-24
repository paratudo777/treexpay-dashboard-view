// Configuração de domínio base
export const BASE_URL = 'https://treexpay.site';

// URL completa para checkouts
export const getCheckoutUrl = (slug: string) => `${BASE_URL}/checkout/${slug}`;
