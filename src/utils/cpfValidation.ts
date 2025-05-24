
export function isValidCpf(cpf: string): boolean {
  if (!cpf) return false;
  
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 1; i <= len; i++) sum += parseInt(cpf[i-1]) * (len + 1 - i);
    let rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

export function formatCpf(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}
