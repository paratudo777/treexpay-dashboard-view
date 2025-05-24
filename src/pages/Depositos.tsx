
import { DashboardLayout } from "@/components/DashboardLayout";
import { NovaEraPaymentTest } from "@/components/payments/NovaEraPaymentTest";
import { PixDepositWithProfile } from "@/components/payments/PixDepositWithProfile";

export default function Depositos() {
  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Depósitos</h1>
        
        {/* PIX Deposit with Profile Completion */}
        <PixDepositWithProfile />
        
        {/* NovaEra Payment Test */}
        <NovaEraPaymentTest />
      </div>
    </DashboardLayout>
  );
}
