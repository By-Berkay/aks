import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/i18n";
import { Shell } from "@/components/Shell";
import type { PermissionCode } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.kind !== "company") redirect("/admin");

  const [company, { t }] = await Promise.all([
    prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, settings: { select: { primaryColor: true } } },
    }),
    getTranslations(),
  ]);

  const can = (code: PermissionCode) => ctx.permissions.has(code);
  const branchLabel = ctx.branchIds.length === 0 ? t.dashboard.allBranches : `${ctx.branchIds.length} sube`;

  return (
    <div style={{ ["--brand-600" as string]: company?.settings?.primaryColor ?? "#2563eb" }}>
      <Shell
        brand={company?.name ?? t.common.appName}
        contextLine={`${company?.name ?? ""} · ${branchLabel}`}
        userName={ctx.name}
        impersonating={ctx.impersonated ? { companyName: company?.name ?? "", companyId: ctx.companyId } : null}
        groups={[
          { items: [{ href: "/app", label: t.nav.dashboard }] },
          {
            title: t.nav.sales,
            items: [
              { href: "/app/pos", label: t.nav.pos, disabled: true },
              { href: "/app/sales", label: t.nav.salesList, disabled: true },
              { href: "/app/returns", label: t.nav.returns, disabled: true },
            ],
          },
          {
            title: t.nav.stock,
            items: [
              { href: "/app/products", label: t.nav.products, disabled: true },
              { href: "/app/stock/movements", label: t.nav.movements, disabled: true },
              { href: "/app/purchases", label: t.nav.purchases, disabled: true },
            ],
          },
          {
            title: t.nav.current,
            items: [
              { href: "/app/customers", label: t.nav.customers, disabled: true },
              { href: "/app/suppliers", label: t.nav.suppliers, disabled: true },
            ],
          },
          {
            title: t.nav.cash,
            items: [
              { href: "/app/cash", label: t.nav.cash, disabled: true },
              { href: "/app/expenses", label: t.nav.expenses, disabled: true },
            ],
          },
          {
            title: t.nav.management,
            items: [
              ...(can("users.view") ? [{ href: "/app/users", label: t.nav.users }] : []),
              ...(can("branches.view") ? [{ href: "/app/branches", label: t.nav.branches }] : []),
              { href: "/app/settings", label: t.nav.settings, disabled: true },
            ],
          },
        ]}
      >
        {children}
      </Shell>
    </div>
  );
}
