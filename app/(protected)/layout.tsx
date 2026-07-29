import { AppShell } from "@/components/layout/app-shell";
import { getVisibleNavigation } from "@/config/navigation";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const principal = await getApplicationPrincipal();

  return (
    <AppShell
      navigation={getVisibleNavigation(principal)}
      principal={principal}
    >
      {children}
    </AppShell>
  );
}
