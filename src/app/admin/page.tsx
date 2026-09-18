import Link from "next/link";
import { requirePlatform } from "@/lib/auth";
import { platformStats } from "@/modules/companies/service";
import { getTranslations } from "@/i18n";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import { GrowthChart } from "./GrowthChart";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requirePlatform();
  const [stats, { t, locale }] = await Promise.all([platformStats(), getTranslations()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.nav.dashboard}</h1>
        <Link
          href="/admin/companies"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t.admin.newCompany}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.admin.totalCompanies} value={stats.totalCompanies} />
        <StatCard label={t.admin.activeCompanies} value={stats.activeCompanies} />
        <StatCard label={t.admin.trialCompanies} value={stats.trialCompanies} />
        <StatCard label={t.admin.passiveCompanies} value={stats.suspendedCompanies} />
        <StatCard label={t.admin.totalUsers} value={stats.totalUsers} />
        <StatCard label={t.admin.activeUsers} value={stats.activeUsers} />
        <StatCard label={t.admin.totalBranches} value={stats.totalBranches} />
        <StatCard label={t.admin.todayActivity} value={stats.todayActivity} hint="audit log" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">{t.admin.companyGrowth}</h2>
          <GrowthChart data={stats.growth} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">{t.admin.recentCompanies}</h2>
          <ul className="space-y-3">
            {stats.recentCompanies.length === 0 ? (
              <li className="text-sm text-slate-500">{t.common.empty}</li>
            ) : (
              stats.recentCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/companies/${c.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium hover:underline">{c.name}</span>
                    <span className="text-xs text-slate-400">
                      {formatDate(c.createdAt, locale === "tr" ? "tr-TR" : "en-US")}
                    </span>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
