
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, FileText, Shield } from "lucide-react";
import { UserInfoTab } from "./UserInfoTab";
import { FeesTab } from "./FeesTab";
import { NotificationsTab } from "./NotificationsTab";
import { SecurityTab } from "./SecurityTab";

export function ProfileTabs() {
  return (
    <Tabs defaultValue="info">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="info" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>Informações</span>
        </TabsTrigger>
        <TabsTrigger value="fees" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Minhas Taxas</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span>Notificações</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span>Segurança</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="info">
        <UserInfoTab />
      </TabsContent>
      
      <TabsContent value="fees">
        <FeesTab />
      </TabsContent>
      
      <TabsContent value="notifications">
        <NotificationsTab />
      </TabsContent>
      
      <TabsContent value="security">
        <SecurityTab />
      </TabsContent>
    </Tabs>
  );
}
