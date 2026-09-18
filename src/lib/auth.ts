import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, type SessionPayload } from "@/lib/jwt";
import { Errors } from "@/lib/errors";
import { resolvePermissions, type PermissionCode } from "@/lib/permissions";

export type PlatformContext = {
  kind: "platform";
  userId: string;
  name: string;
  /** Super Admin bir firmayi goruntuluyorsa dolu olur */
  impersonatedCompanyId?: string;
};

export type CompanyContext = {
  kind: "company";
  userId: string;
  name: string;
  companyId: string;
  permissions: Set<string>;
  branchIds: string[];
  maxDiscountPercent: number | null;
  /** Super Admin impersonation ile girdiyse true */
  impersonated: boolean;
};

export type AuthContext = PlatformContext | CompanyContext;

const COOKIE = process.env.SESSION_COOKIE_NAME ?? "erp_session";

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Tenant context'i SADECE token'dan uretir.
 * Istemciden gelen companyId hicbir zaman dikkate alinmaz (IDOR korumasi).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await readSession();
  if (!session) return null;

  if (session.type === "platform") {
    const platformUser = await prisma.platformUser.findFirst({
      where: { id: session.sub, deletedAt: null, status: "ACTIVE" },
    });
    if (!platformUser) return null;

    if (session.actAsCompanyId) {
      const company = await prisma.company.findFirst({
        where: { id: session.actAsCompanyId, deletedAt: null },
        select: { id: true },
      });
      if (company) {
        // Super Admin firma panelinde tum yetkilere sahiptir ama izi audit'e dusulur.
        const { ALL_PERMISSIONS } = await import("@/lib/permissions");
        return {
          kind: "company",
          userId: platformUser.id,
          name: platformUser.fullName,
          companyId: company.id,
          permissions: new Set<string>(ALL_PERMISSIONS),
          branchIds: [],
          maxDiscountPercent: null,
          impersonated: true,
        };
      }
    }
    return { kind: "platform", userId: platformUser.id, name: platformUser.fullName };
  }

  const user = await prisma.user.findFirst({
    where: { id: session.sub, deletedAt: null, status: "ACTIVE" },
    include: {
      company: { select: { id: true, status: true, deletedAt: true } },
      userBranches: { select: { branchId: true } },
      userPermissions: { include: { permission: { select: { code: true } } } },
      userRoles: {
        include: {
          role: { include: { rolePermissions: { include: { permission: { select: { code: true } } } } } },
        },
      },
    },
  });

  if (!user || user.company.deletedAt) return null;
  if (["SUSPENDED", "EXPIRED", "CANCELLED"].includes(user.company.status)) return null;

  const rolePermissions = user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.code),
  );
  const userAllow = user.userPermissions.filter((p) => p.effect === "ALLOW").map((p) => p.permission.code);
  const userDeny = user.userPermissions.filter((p) => p.effect === "DENY").map((p) => p.permission.code);

  return {
    kind: "company",
    userId: user.id,
    name: user.fullName,
    companyId: user.companyId,
    permissions: resolvePermissions({ rolePermissions, userAllow, userDeny }),
    branchIds: user.userBranches.map((b) => b.branchId),
    maxDiscountPercent: user.maxDiscountPercent ? Number(user.maxDiscountPercent) : null,
    impersonated: false,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw Errors.unauthorized();
  return ctx;
}

export async function requirePlatform(): Promise<PlatformContext> {
  const ctx = await requireAuth();
  if (ctx.kind !== "platform") throw Errors.forbidden("Bu alan yalnizca platform yoneticisine aciktir.");
  return ctx;
}

export async function requireCompany(): Promise<CompanyContext> {
  const ctx = await requireAuth();
  if (ctx.kind !== "company") throw Errors.forbidden("Bu alan firma kullanicilarina aciktir.");
  return ctx;
}

export async function requirePermission(...codes: PermissionCode[]): Promise<CompanyContext> {
  const ctx = await requireCompany();
  const missing = codes.filter((c) => !ctx.permissions.has(c));
  if (missing.length > 0) throw Errors.forbidden();
  return ctx;
}

export function hasPermission(ctx: AuthContext, code: PermissionCode): boolean {
  return ctx.kind === "company" && ctx.permissions.has(code);
}

export { canAccessBranch } from "@/lib/tenant";

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}
