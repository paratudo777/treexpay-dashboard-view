
import { useState } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WithdrawalRow } from "./WithdrawalRow";

export type WithdrawalStatus = "solicitado" | "processado" | "rejeitado";

export interface Withdrawal {
  id: string;
  name: string;
  email: string;
  amount: number;
  pixKeyType: string;
  pixKey: string;
  status: WithdrawalStatus;
  requestDate: string;
}

const mockWithdrawals: Withdrawal[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@empresa.com',
    amount: 350.00,
    pixKeyType: 'email',
    pixKey: 'joao@pix.com',
    status: 'solicitado',
    requestDate: '2025-05-25 10:30',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@empresa.com',
    amount: 150.00,
    pixKeyType: 'telefone',
    pixKey: '(11) 99999-0000',
    status: 'rejeitado',
    requestDate: '2025-05-24 16:20',
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com',
    amount: 500.00,
    pixKeyType: 'cpf',
    pixKey: '123.456.789-00',
    status: 'processado',
    requestDate: '2025-05-23 14:15',
  },
  {
    id: '4',
    name: 'Ana Paula',
    email: 'ana@empresa.com',
    amount: 75.00,
    pixKeyType: 'chave_aleatoria',
    pixKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    status: 'solicitado',
    requestDate: '2025-05-25 09:45',
  },
];

export const WithdrawalTable = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(mockWithdrawals);

  const handleApprove = (id: string) => {
    setWithdrawals(prev => 
      prev.map(withdrawal => 
        withdrawal.id === id 
          ? { ...withdrawal, status: 'processado' as WithdrawalStatus }
          : withdrawal
      )
    );
  };

  const handleReject = (id: string) => {
    setWithdrawals(prev => 
      prev.map(withdrawal => 
        withdrawal.id === id 
          ? { ...withdrawal, status: 'rejeitado' as WithdrawalStatus }
          : withdrawal
      )
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Tipo Pix</TableHead>
            <TableHead>Chave Pix</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <WithdrawalRow
              key={withdrawal.id}
              withdrawal={withdrawal}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
