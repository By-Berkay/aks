import { requireCompany } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/i18n";
import { Card, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CompanyDashboard() {
  const ctx = await requireCompany();
  const { t } = await getTranslations();

  // PHASE 1: yapisal KPI'lar. Ciro / kar / stok KPI'lari PHASE 5-10'da eklenecek.
  const [branches, warehouses, registers, users] = await Promise.all([
    prisma.branch.count({ where: { companyId: ctx.companyId, deletedAt: null } }),
    prisma.warehouse.count({ where: { companyId: ctx.companyId, deletedAt: null } }),
    prisma.cashRegister.count({ where: { companyId: ctx.companyId, deletedAt: null } }),
    prisma.user.count({ where: { companyId: ctx.companyId, deletedAt: null } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.nav.branches} value={branches} />
        <StatCard label={t.nav.warehouses} value={warehouses} />
        <StatCard label={t.nav.registers} value={registers} />
        <StatCard label={t.nav.users} value={users} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">Satis ve stok KPI&apos;lari</h2>
        <p className="mt-2 text-sm text-slate-500">{t.dashboard.comingSoon}</p>
      </Card>
    </div>
  );
}
