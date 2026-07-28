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
  const unreadAlertsCount = await alertService.countUnread(principal);

  return (
    <AppShell
      navigation={getVisibleNavigation(principal)}
      principal={principal}
      unreadAlertsCount={unreadAlertsCount}
    >
      {children}
    </AppShell>
  );
}
