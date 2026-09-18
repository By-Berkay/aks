import { ok, handler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantWhereWithDeleted } from "@/lib/tenant";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const ctx = await requirePermission("roles.view");
  const roles = await prisma.role.findMany({
    where: tenantWhereWithDeleted(ctx),
    orderBy: { name: "asc" },
    include: {
      rolePermissions: { select: { permission: { select: { code: true } } } },
      _count: { select: { userRoles: true } },
    },
  });
  return ok(
    roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissions: r.rolePermissions.map((rp) => rp.permission.code),
    })),
  );
});
