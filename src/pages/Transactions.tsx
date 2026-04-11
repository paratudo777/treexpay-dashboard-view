import { useState } from "react";
import { Filter, ArrowUpDown, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/transactions/StatusBadge";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalTransactions } from "@/hooks/useLocalTransactions";

interface CombinedTransaction {
  id: string;
  code: string;
  type: string;
  status: string;
  created_at: string;
  description: string;
  amount: number;
}

// Generate a friendly visual code based on index
const generateFriendlyCode = (index: number) => {
  return `TXN${String(index + 1).padStart(4, '0')}`;
};

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case 'withdrawal': return 'Saque PIX';
    case 'deposit': return 'Depósito PIX';
    case 'payment': return 'Pagamento';
    default: return type;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'withdrawal': return <TrendingDown className="h-4 w-4 text-red-400" />;
    case 'deposit': return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    default: return <RefreshCw className="h-4 w-4 text-blue-400" />;
  }
};

const formatDescription = (description: string) => {
  if (!description) return "";
  const regex = /\(Líquido: R\$\s*([\d.]+)\)/;
  const match = description.match(regex);
  if (match && match[1]) {
    const liquidAmount = parseFloat(match[1]);
    if (!isNaN(liquidAmount)) {
      const formatted = liquidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return description.replace(match[0], `(Líquido: R$ ${formatted})`);
    }
  }
  return description;
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

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();
  const { transactions: supabaseTransactions, loading: supabaseLoading } = useTransactions();
  const { transactions: localTransactions, loading: localLoading } = useLocalTransactions();

  const loading = supabaseLoading || localLoading;

  const allTransactions: CombinedTransaction[] = [
    ...supabaseTransactions.map(tx => ({
      id: tx.id, code: tx.code, type: tx.type, status: tx.status,
      created_at: tx.created_at, description: tx.description, amount: tx.amount
    })),
    ...localTransactions.map(tx => ({
      id: tx.id, code: tx.code, type: tx.type, status: tx.status,
      created_at: tx.created_at, description: tx.description, amount: tx.amount
    }))
  ];

  const sortedTransactions = allTransactions.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredTransactions = sortedTransactions.filter(transaction =>
    statusFilter === "todos" ? true : transaction.status === statusFilter
  );

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    const filterName = filter === "todos" ? "todas transações" : `transações ${getFilterLabel(filter).toLowerCase()}s`;
    toast({ title: "Filtro aplicado", description: `Mostrando ${filterName}.` });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando transações...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transações</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2 bg-[hsl(var(--accent-cta))] hover:bg-[hsl(var(--accent-cta)/0.85)] text-white border-0">
                <Filter className="h-4 w-4" />
                <span>{getFilterLabel(statusFilter)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {["todos", "pending", "approved", "paid", "denied", "cancelled", "refunded"].map(f => (
                <DropdownMenuItem key={f} onClick={() => handleFilterChange(f)}>
                  {getFilterLabel(f)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {filteredTransactions.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <ArrowUpDown className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma transação encontrada.</p>
              <p className="text-muted-foreground/60 text-sm mt-1">As transações aparecerão aqui quando forem realizadas.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-semibold">Código</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Tipo</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Data e Hora</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Descrição</TableHead>
                        <TableHead className="text-muted-foreground font-semibold text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction, index) => (
                        <TableRow
                          key={transaction.id}
                          className="border-border/30 hover:bg-accent/30 transition-colors duration-200"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <TableCell>
                            <span className="font-mono text-sm px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
                              {generateFriendlyCode(index)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(transaction.type)}
                              <span className="text-sm">{getTransactionTypeLabel(transaction.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={transaction.status as any} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(transaction.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {formatDescription(transaction.description)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${transaction.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {transaction.type === 'withdrawal' ? '- ' : '+ '}
                              {formatAmount(transaction.amount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <Card
                  key={transaction.id}
                  className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in hover:border-primary/30 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
                          {generateFriendlyCode(index)}
                        </span>
                        <StatusBadge status={transaction.status as any} />
                      </div>
                      <span className={`font-bold text-lg ${transaction.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'} {formatAmount(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(transaction.type)}
                      <span className="text-sm font-medium">{getTransactionTypeLabel(transaction.type)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                    {transaction.description && (
                      <p className="text-xs text-muted-foreground/70 mt-2 truncate">{formatDescription(transaction.description)}</p>
                    )}
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
