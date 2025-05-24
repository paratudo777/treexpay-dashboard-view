
import { DashboardLayout } from "@/components/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentationButton } from "@/components/profile/DocumentationButton";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export default function Perfil() {
  const { isLoading } = useProfile();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Perfil</h1>
        
        <div className="mb-6">
          <DocumentationButton />
        </div>
        
        <ProfileTabs />
      </div>
    </DashboardLayout>
  );
}
