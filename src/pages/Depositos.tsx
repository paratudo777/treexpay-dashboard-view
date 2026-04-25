import { DashboardLayout } from "@/components/DashboardLayout";
import { PixDepositWithProfile } from "@/components/payments/PixDepositWithProfile";

export default function Depositos() {
  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-2xl space-y-6 px-1 sm:px-4">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Depósitos</h1>
        </div>

        {/* PIX Deposit with Profile Completion */}
        <PixDepositWithProfile />
      </div>
    </DashboardLayout>
  );
}
