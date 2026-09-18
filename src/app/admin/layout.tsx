import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getTranslations } from "@/i18n";
import { Shell } from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.kind !== "platform") redirect("/unauthorized");

  const { t } = await getTranslations();
  return (
    <Shell
      brand="Platform Admin"
      contextLine={t.admin.title}
      userName={ctx.name}
      groups={[
        {
          items: [
            { href: "/admin", label: t.nav.dashboard },
            { href: "/admin/companies", label: t.nav.companies },
          ],
        },
        {
          title: t.nav.management,
          items: [
            { href: "/admin/plans", label: t.nav.plans, disabled: true },
            { href: "/admin/audit", label: t.nav.audit, disabled: true },
            { href: "/admin/settings", label: t.nav.settings, disabled: true },
          ],
        },
      ]}
    >
      {children}
    </Shell>
  );
}
