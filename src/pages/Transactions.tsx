
import { useState, useMemo } from "react";
import { Check, X, Loader, Filter } from "lucide-react";
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

// Status type definition
type TransactionStatus = "aprovada" | "pendente" | "cancelada" | "reembolsada";

// Transaction interface
interface Transaction {
  id: string;
  code: string;
  status: TransactionStatus;
  date: string;
  time: string;
  description: string;
  amount: number;
}

// Mock data for transactions
const mockTransactions: Transaction[] = [
  {
    id: "1",
    code: "TX-9832JD7",
    status: "aprovada",
    date: "20/05/2025",
    time: "14:35",
    description: "Pagamento - João Silva",
    amount: 250.0
  },
  {
    id: "2",
    code: "TX-8743KL9",
    status: "pendente",
    date: "20/05/2025",
    time: "13:22",
    description: "Compra - Mercado ABC",
    amount: 125.5
  },
  {
    id: "3",
    code: "TX-7621MN4",
    status: "cancelada",
    date: "19/05/2025",
    time: "16:40",
    description: "Assinatura - Streaming X",
    amount: 39.9
  },
  {
    id: "4",
    code: "TX-6532PQ2",
    status: "aprovada",
    date: "19/05/2025",
    time: "10:15",
    description: "Pagamento - Maria Souza",
    amount: 478.25
  },
  {
    id: "5",
    code: "TX-5421RS8",
    status: "reembolsada",
    date: "18/05/2025",
    time: "09:30",
    description: "Produto - Loja Online",
    amount: 89.99
  },
  {
    id: "6",
    code: "TX-4310TV5",
    status: "aprovada",
    date: "17/05/2025",
    time: "17:45",
    description: "Serviço - Consultoria",
    amount: 1200.0
  },
  {
    id: "7",
    code: "TX-3209UW3",
    status: "pendente",
    date: "17/05/2025",
    time: "11:20",
    description: "Pagamento - Carlos Santos",
    amount: 350.0
  },
  {
    id: "8",
    code: "TX-2198WY7",
    status: "aprovada",
    date: "16/05/2025",
    time: "15:55",
    description: "Compra - Eletrônicos",
    amount: 599.9
  }
];

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();
  
  // Filter transactions based on selected status
  const filteredTransactions = useMemo(() => {
    if (statusFilter === "todos") {
      return mockTransactions;
    }
    return mockTransactions.filter(transaction => transaction.status === statusFilter);
  }, [statusFilter]);

  // Function to get status icon based on transaction status
  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case "aprovada":
        return <Check className="h-4 w-4 text-treexpay-green" />;
      case "pendente":
        return <Loader className="h-4 w-4 text-treexpay-yellow animate-spin" />;
      case "cancelada":
      case "reembolsada":
        return <X className="h-4 w-4 text-treexpay-red" />;
      default:
        return null;
    }
  };

  // Function to get color class based on transaction status
  const getAmountColorClass = (status: TransactionStatus) => {
    switch (status) {
      case "aprovada":
        return "text-treexpay-green";
      case "pendente":
        return "text-treexpay-yellow";
      case "cancelada":
      case "reembolsada":
        return "text-treexpay-red";
      default:
        return "";
    }
  };

  // Format amount to BRL currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Show toast when filter changes
  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    
    const filterName = filter === "todos" ? "todas transações" : `transações ${filter}s`;
    
    toast({
      title: "Filtro aplicado",
      description: `Mostrando ${filterName}.`
    });
  };

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
                <span>
                  {statusFilter === "todos" ? "Todos" : 
                   statusFilter === "aprovada" ? "Aprovadas" :
                   statusFilter === "pendente" ? "Pendentes" :
                   statusFilter === "cancelada" ? "Canceladas" :
                   "Reembolsadas"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleFilterChange("todos")}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("aprovada")}>
                Aprovadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("pendente")}>
                Pendentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("cancelada")}>
                Canceladas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange("reembolsada")}>
                Reembolsadas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono">{transaction.code}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        <span className="capitalize">{transaction.status}</span>
                      </TableCell>
                      <TableCell>{transaction.date} - {transaction.time}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`text-right ${getAmountColorClass(transaction.status)}`}>
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
                  <div className="flex items-center gap-1 text-sm">
                    {getStatusIcon(transaction.status)}
                    <span className="capitalize">{transaction.status}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{transaction.date} - {transaction.time}</p>
                  <p>{transaction.description}</p>
                  <p className={`text-lg font-semibold ${getAmountColorClass(transaction.status)}`}>
                    {formatAmount(transaction.amount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
