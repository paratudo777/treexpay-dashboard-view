
export function qrImage(payload: string): string {
  // Generate QR code image URL using api.qrserver.com
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(payload)}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
