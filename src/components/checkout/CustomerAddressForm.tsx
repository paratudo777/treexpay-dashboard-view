
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isValidCpf } from '@/utils/cpfValidation';

export interface CustomerAddress {
  cep: string;
  bairro: string;
  numero: string;
  cidade: string;
  estado: string;
  endereco: string;
  phone: string;
}

interface CustomerAddressFormProps {
  address: CustomerAddress;
  onChange: (address: CustomerAddress) => void;
  customerName: string;
  onNameChange: (name: string) => void;
  customerEmail: string;
  onEmailChange: (email: string) => void;
  cpf: string;
  onCpfChange: (cpf: string) => void;
  touched: Record<string, boolean>;
  onBlur: (field: string) => void;
}

// Masks
const maskCep = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .slice(0, 18);
};

// Validations
export const validateName = (n: string) => n.trim().split(/\s+/).filter(Boolean).length >= 2;
export const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const validateCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false;
    let size = 12, nums = d.substring(0, size), sum = 0;
    const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < size; i++) sum += parseInt(nums[i]) * weights1[i];
    let r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (r !== parseInt(d[12])) return false;
    size = 13; nums = d.substring(0, size); sum = 0;
    const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < size; i++) sum += parseInt(nums[i]) * weights2[i];
    r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return r === parseInt(d[13]);
  }
  return false;
};
export const validatePhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
};
export const validateCep = (v: string) => /^\d{5}-?\d{3}$/.test(v);

export const isAddressFormValid = (
  name: string, email: string, cpf: string, addr: CustomerAddress
) => {
  return (
    validateName(name) &&
    validateEmail(email) &&
    validateCpfCnpj(cpf) &&
    validatePhone(addr.phone) &&
    validateCep(addr.cep) &&
    addr.bairro.trim().length > 0 &&
    addr.numero.trim().length > 0 &&
    addr.cidade.trim().length > 0 &&
    addr.estado.trim().length >= 2 &&
    addr.endereco.trim().length > 0
  );
};

const FieldError = ({ show, msg }: { show: boolean; msg: string }) =>
  show ? <p className="text-xs text-destructive mt-1">{msg}</p> : null;

export default function CustomerAddressForm({
  address, onChange, customerName, onNameChange, customerEmail, onEmailChange,
  cpf, onCpfChange, touched, onBlur,
}: CustomerAddressFormProps) {
  const [cepLoading, setCepLoading] = useState(false);

  const set = useCallback((field: keyof CustomerAddress, value: string) => {
    onChange({ ...address, [field]: value });
  }, [address, onChange]);

  // CEP auto-fill
  useEffect(() => {
    const raw = address.cep.replace(/\D/g, '');
    if (raw.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${raw}/json/`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || data.erro) return;
        onChange({
          ...address,
          endereco: data.logradouro || address.endereco,
          bairro: data.bairro || address.bairro,
          cidade: data.localidade || address.cidade,
          estado: data.uf || address.estado,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCepLoading(false); });
    return () => { cancelled = true; };
  }, [address.cep]);

  const inputCls = (field: string, isValid: boolean) =>
    cn("h-11", touched[field] && !isValid && "border-destructive focus-visible:ring-destructive");

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dados do Cliente</h3>

      <div className="space-y-1.5">
        <Label htmlFor="customerName" className="text-xs font-bold uppercase tracking-wide">Nome Completo *</Label>
        <Input id="customerName" value={customerName} onChange={e => onNameChange(e.target.value)}
          onBlur={() => onBlur('name')} placeholder="CLEBER OLIVEIRA SOUZA"
          className={inputCls('name', validateName(customerName))} />
        <FieldError show={touched.name && !validateName(customerName)} msg="Informe nome e sobrenome" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customerEmail" className="text-xs font-bold uppercase tracking-wide">E-mail *</Label>
        <Input id="customerEmail" type="email" value={customerEmail} onChange={e => onEmailChange(e.target.value)}
          onBlur={() => onBlur('email')} placeholder="nome@email.com"
          className={inputCls('email', validateEmail(customerEmail))} />
        <FieldError show={touched.email && !validateEmail(customerEmail)} msg="Informe um e-mail válido" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cpf" className="text-xs font-bold uppercase tracking-wide">CPF/CNPJ *</Label>
          <Input id="cpf" value={cpf} onChange={e => onCpfChange(maskCpfCnpj(e.target.value))}
            onBlur={() => onBlur('cpf')} placeholder="000.000.000-00" maxLength={18}
            inputMode="numeric" className={cn("h-11 font-mono", touched.cpf && !validateCpfCnpj(cpf) && "border-destructive focus-visible:ring-destructive")} />
          <FieldError show={touched.cpf && !validateCpfCnpj(cpf)} msg="CPF/CNPJ inválido" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide">Telefone *</Label>
          <Input id="phone" value={address.phone} onChange={e => set('phone', maskPhone(e.target.value))}
            onBlur={() => onBlur('phone')} placeholder="(11) 99999-9999" maxLength={15}
            inputMode="tel" className={inputCls('phone', validatePhone(address.phone))} />
          <FieldError show={touched.phone && !validatePhone(address.phone)} msg="Telefone inválido" />
        </div>
      </div>

      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-2">Endereço</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cep" className="text-xs font-bold uppercase tracking-wide">CEP *</Label>
          <Input id="cep" value={address.cep} onChange={e => set('cep', maskCep(e.target.value))}
            onBlur={() => onBlur('cep')} placeholder="00000-000" maxLength={9}
            inputMode="numeric" className={cn("h-11 font-mono", touched.cep && !validateCep(address.cep) && "border-destructive focus-visible:ring-destructive")} />
          {cepLoading && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
          <FieldError show={touched.cep && !validateCep(address.cep)} msg="CEP inválido" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="numero" className="text-xs font-bold uppercase tracking-wide">Número *</Label>
          <Input id="numero" value={address.numero} onChange={e => set('numero', e.target.value)}
            onBlur={() => onBlur('numero')} placeholder="123"
            className={inputCls('numero', address.numero.trim().length > 0)} />
          <FieldError show={touched.numero && !address.numero.trim()} msg="Obrigatório" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="endereco" className="text-xs font-bold uppercase tracking-wide">Endereço *</Label>
        <Input id="endereco" value={address.endereco} onChange={e => set('endereco', e.target.value)}
          onBlur={() => onBlur('endereco')} placeholder="Rua, Avenida..."
          className={inputCls('endereco', address.endereco.trim().length > 0)} />
        <FieldError show={touched.endereco && !address.endereco.trim()} msg="Obrigatório" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bairro" className="text-xs font-bold uppercase tracking-wide">Bairro *</Label>
          <Input id="bairro" value={address.bairro} onChange={e => set('bairro', e.target.value)}
            onBlur={() => onBlur('bairro')} placeholder="Centro"
            className={inputCls('bairro', address.bairro.trim().length > 0)} />
          <FieldError show={touched.bairro && !address.bairro.trim()} msg="Obrigatório" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cidade" className="text-xs font-bold uppercase tracking-wide">Cidade *</Label>
          <Input id="cidade" value={address.cidade} onChange={e => set('cidade', e.target.value)}
            onBlur={() => onBlur('cidade')} placeholder="São Paulo"
            className={inputCls('cidade', address.cidade.trim().length > 0)} />
          <FieldError show={touched.cidade && !address.cidade.trim()} msg="Obrigatório" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estado" className="text-xs font-bold uppercase tracking-wide">UF *</Label>
          <Input id="estado" value={address.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))}
            onBlur={() => onBlur('estado')} placeholder="SP" maxLength={2}
            className={inputCls('estado', address.estado.trim().length >= 2)} />
          <FieldError show={touched.estado && address.estado.trim().length < 2} msg="Obrigatório" />
        </div>
      </div>
    </div>
  );
}
