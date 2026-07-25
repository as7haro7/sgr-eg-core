import { AppShell } from "@/components/layout/app-shell";
import { getVisibleNavigation } from "@/config/navigation";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AlertService } from "@/modules/alerts/services/alert.service";

const alertService = new AlertService();

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const principal = await getApplicationPrincipal();
  const unreadAlerts = await alertService.list({ page: 1, pageSize: 1, status: "pendiente" }, principal);

  return (
    <AppShell
      navigation={getVisibleNavigation(principal)}
      principal={principal}
      unreadAlertsCount={unreadAlerts.unreadCount}
    >
      {children}
    </AppShell>
  );
}
