import { getCurrentUser } from "@/lib/auth/session";
import { SettingsShell } from "@/components/settings/settings-shell";

/** Shared horizontal configuration tabs, without an extra sidebar. */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return <>{children}</>;
  return <SettingsShell user={user}>{children}</SettingsShell>;
}
