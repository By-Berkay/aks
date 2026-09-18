import { requirePlatform } from "@/lib/auth";
import { listCompanies } from "@/modules/companies/service";
import { getTranslations } from "@/i18n";
import { CompaniesClient } from "./CompaniesClient";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requirePlatform();
  const [{ items }, { t }] = await Promise.all([
    listCompanies({ page: 1, pageSize: 20 }),
    getTranslations(),
  ]);

  return (
    <CompaniesClient
      initial={items.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        status: c.status,
        planCode: c.plan?.code ?? "-",
        userCount: c._count.users,
        branchCount: c._count.branches,
        createdAt: c.createdAt.toISOString(),
      }))}
      labels={{ title: t.nav.companies, newCompany: t.admin.newCompany, empty: t.common.empty }}
    />
  );
}
