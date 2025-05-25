
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
import { useTransactions, TransactionStatus } from "@/hooks/useTransactions";
import { StatusBadge } from "@/components/transactions/StatusBadge";

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();
  const { transactions, loading, fetchTransactions } = useTransactions();

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

  // Show toast when filter changes and fetch filtered data
  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    
    const filterName = filter === "todos" ? "todas transações" : `transações ${getFilterLabel(filter).toLowerCase()}s`;
    
    toast({
      title: "Filtro aplicado",
      description: `Mostrando ${filterName}.`
    });

    // Convert filter to proper type and fetch transactions
    const supabaseFilter = filter === "todos" ? undefined : filter as TransactionStatus;
    fetchTransactions(supabaseFilter);
  };

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case "todos": return "Todos";
      case "approved": return "Aprovadas";
      case "pending": return "Pendentes";
      case "cancelled": return "Canceladas";
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
              <DropdownMenuItem onClick={() => handleFilterChange("approved")}>
                Aprovadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("pending")}>
                Pendentes
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

        {transactions.length === 0 ? (
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
                        <TableHead>Status</TableHead>
                        <TableHead>Data e Hora</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono">{transaction.code}</TableCell>
                          <TableCell>
                            <StatusBadge status={transaction.status} />
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
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-mono">{transaction.code}</CardTitle>
                      <StatusBadge status={transaction.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2">
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
