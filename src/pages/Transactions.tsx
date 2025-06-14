
import { useState } from "react";
import { Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/transactions/StatusBadge";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalTransactions } from "@/hooks/useLocalTransactions";

// Interface combinada para todas as transações
interface CombinedTransaction {
  id: string;
  code: string;
  type: string;
  status: string;
  created_at: string;
  description: string;
  amount: number;
}

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();
  
  // Buscar transações do Supabase
  const { transactions: supabaseTransactions, loading: supabaseLoading } = useTransactions();
  
  // Buscar transações locais (saques)
  const { transactions: localTransactions, loading: localLoading } = useLocalTransactions();

  const loading = supabaseLoading || localLoading;

  // Combinar todas as transações
  const allTransactions: CombinedTransaction[] = [
    // Transações do Supabase
    ...supabaseTransactions.map(tx => ({
      id: tx.id,
      code: tx.code,
      type: tx.type,
      status: tx.status,
      created_at: tx.created_at,
      description: tx.description,
      amount: tx.amount
    })),
    // Transações locais (saques)
    ...localTransactions.map(tx => ({
      id: tx.id,
      code: tx.code,
      type: tx.type,
      status: tx.status,
      created_at: tx.created_at,
      description: tx.description,
      amount: tx.amount
    }))
  ];

  // Ordenar por data (mais recente primeiro)
  const sortedTransactions = allTransactions.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Format amount to BRL currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction type label
  const getTransactionTypeLabel = (transaction: CombinedTransaction) => {
    switch (transaction.type) {
      case 'withdrawal':
        return 'Saque PIX';
      case 'deposit':
        return 'Depósito PIX';
      case 'payment':
        return 'Pagamento';
      default:
        return transaction.type;
    }
  };

  // Filter transactions
  const filteredTransactions = sortedTransactions.filter(transaction => {
    if (statusFilter === "todos") return true;
    return transaction.status === statusFilter;
  });

  // Show toast when filter changes
  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    
    const filterName = filter === "todos" ? "todas transações" : `transações ${getFilterLabel(filter).toLowerCase()}s`;
    
    toast({
      title: "Filtro aplicado",
      description: `Mostrando ${filterName}.`
    });
  };

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case "todos": return "Todos";
      case "approved": return "Aprovadas";
      case "pending": return "Pendentes";
      case "cancelled": return "Canceladas";
      case "denied": return "Negadas";
      case "paid": return "Pagas";
      case "refunded": return "Reembolsadas";
      default: return "Todos";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando transações...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-treexpay-medium">Transações</h1>
          
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{getFilterLabel(statusFilter)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleFilterChange("todos")}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("pending")}>
                Pendentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("approved")}>
                Aprovadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("paid")}>
                Pagas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("denied")}>
                Negadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("cancelled")}>
                Canceladas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("refunded")}>
                Reembolsadas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop view - Table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data e Hora</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono">{transaction.code}</TableCell>
                          <TableCell>{getTransactionTypeLabel(transaction)}</TableCell>
                          <TableCell>
                            <StatusBadge status={transaction.status as any} />
                          </TableCell>
                          <TableCell>{formatDateTime(transaction.created_at)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile view - Cards */}
            <div className="md:hidden space-y-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-mono">{transaction.code}</CardTitle>
                      <StatusBadge status={transaction.status as any} />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{getTransactionTypeLabel(transaction)}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                      <p>{transaction.description}</p>
                      <p className="text-lg font-semibold">
                        {formatAmount(transaction.amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
