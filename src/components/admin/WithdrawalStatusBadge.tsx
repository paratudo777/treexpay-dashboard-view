
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X } from "lucide-react";
import { WithdrawalStatus } from "./WithdrawalTable";

interface WithdrawalStatusBadgeProps {
  status: WithdrawalStatus;
}

export const WithdrawalStatusBadge = ({ status }: WithdrawalStatusBadgeProps) => {
  const getStatusConfig = (status: WithdrawalStatus) => {
    switch (status) {
      case "processed":
        return {
          icon: <Check className="h-3 w-3" />,
          label: "Processado",
          variant: "default" as const,
          className: "bg-treexpay-green text-white hover:bg-treexpay-green/80"
        };
      case "requested":
        return {
          icon: <Clock className="h-3 w-3" />,
          label: "Solicitado",
          variant: "secondary" as const,
          className: "bg-treexpay-yellow text-white hover:bg-treexpay-yellow/80"
        };
      case "rejected":
        return {
          icon: <X className="h-3 w-3" />,
          label: "Rejeitado",
          variant: "destructive" as const,
          className: "bg-treexpay-red text-white hover:bg-treexpay-red/80"
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
