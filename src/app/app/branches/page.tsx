import { requirePermission } from "@/lib/auth";
import { listBranches } from "@/modules/structure/service";
import { getTranslations } from "@/i18n";
import { BranchesClient } from "./BranchesClient";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const ctx = await requirePermission("branches.view");
  const [branches, { t }] = await Promise.all([listBranches(ctx), getTranslations()]);

  return (
    <BranchesClient
      canManage={ctx.permissions.has("branches.manage")}
      labels={{ title: t.nav.branches, empty: t.common.empty }}
      initial={branches.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        phone: b.phone,
        manager: b.manager,
        status: b.status,
        warehouses: b._count.warehouses,
        registers: b._count.cashRegisters,
        users: b._count.userBranches,
      }))}
    />
  );
}
