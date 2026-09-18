import { requirePermission } from "@/lib/auth";
import { listCompanyUsers } from "@/modules/users/service";
import { listBranches } from "@/modules/structure/service";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/i18n";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const ctx = await requirePermission("users.view");
  const [users, branches, roles, { t }] = await Promise.all([
    listCompanyUsers(ctx.companyId, { page: 1, pageSize: 50 }),
    listBranches(ctx),
    prisma.role.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: "asc" },
      select: { code: true, name: true },
    }),
    getTranslations(),
  ]);

  return (
    <UsersClient
      canCreate={ctx.permissions.has("users.create")}
      labels={{ title: t.nav.users, empty: t.common.empty }}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      roles={roles}
      initial={users.items.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        status: u.status,
        roles: u.userRoles.map((r) => r.role.name).join(", "),
        branches: u.userBranches.map((b) => b.branch.name).join(", "),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      }))}
    />
  );
}
