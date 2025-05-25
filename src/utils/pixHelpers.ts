
export function qrImage(brCode: string): string {
  // ✅ Tamanho 400×400 melhora leitura significativamente
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(brCode)}`;
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function fmtDateIso(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
  });
}
