
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader, RefreshCw, CreditCard, Clock } from "lucide-react";

type TransactionStatus = "pending" | "approved" | "cancelled" | "refunded" | "denied" | "paid";

interface StatusBadgeProps {
  status: TransactionStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusConfig = (status: TransactionStatus) => {
    switch (status) {
      case "approved":
        return {
          icon: <Check className="h-3 w-3" />,
          label: "Aprovada",
          variant: "default" as const,
          className: "bg-treexpay-green text-white hover:bg-treexpay-green/80"
        };
      case "pending":
        return {
          icon: <Clock className="h-3 w-3" />,
          label: "Pendente",
          variant: "secondary" as const,
          className: "bg-treexpay-yellow text-white hover:bg-treexpay-yellow/80"
        };
      case "cancelled":
        return {
          icon: <X className="h-3 w-3" />,
          label: "Cancelada",
          variant: "destructive" as const,
          className: "bg-treexpay-red text-white hover:bg-treexpay-red/80"
        };
      case "denied":
        return {
          icon: <X className="h-3 w-3" />,
          label: "Negada",
          variant: "destructive" as const,
          className: "bg-treexpay-red text-white hover:bg-treexpay-red/80"
        };
      case "paid":
        return {
          icon: <CreditCard className="h-3 w-3" />,
          label: "Paga",
          variant: "default" as const,
          className: "bg-blue-600 text-white hover:bg-blue-600/80"
        };
      case "refunded":
        return {
          icon: <RefreshCw className="h-3 w-3" />,
          label: "Reembolsada",
          variant: "outline" as const,
          className: "border-treexpay-red text-treexpay-red hover:bg-treexpay-red/10"
        };
      default:
        return {
          icon: null,
          label: status,
          variant: "outline" as const,
          className: ""
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
};
