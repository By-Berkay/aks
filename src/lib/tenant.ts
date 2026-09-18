import type { CompanyContext } from "@/lib/auth";
import { Errors } from "@/lib/errors";

/**
 * Tenant filtresi. Her sorguda kullanilmali.
 * companyId daima context'ten gelir; istemciden gelen deger kullanilmaz.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  ctx: CompanyContext,
  where: T = {} as T,
): T & { companyId: string; deletedAt: null } {
  return { ...where, companyId: ctx.companyId, deletedAt: null };
}

export function tenantWhereWithDeleted<T extends Record<string, unknown>>(
  ctx: CompanyContext,
  where: T = {} as T,
): T & { companyId: string } {
  return { ...where, companyId: ctx.companyId };
}

/** Baska tenant'a ait kayda erisim denemesini NOT_FOUND ile keser. */
export function assertSameTenant(ctx: CompanyContext, record: { companyId: string } | null | undefined) {
  if (!record || record.companyId !== ctx.companyId) throw Errors.notFound();
}

export function assertBranchAccess(ctx: CompanyContext, branchIds: string[]) {
  if (ctx.impersonated || ctx.branchIds.length === 0) return;
  const denied = branchIds.filter((id) => !ctx.branchIds.includes(id));
  if (denied.length > 0) throw Errors.forbidden("Bu subeye erisim yetkiniz yok.");
}

/** Kullanicinin subeye erisimi var mi? Sube atamasi yoksa firma geneli kabul edilir. */
export function canAccessBranch(ctx: CompanyContext, branchId: string): boolean {
  if (ctx.impersonated) return true;
  if (ctx.branchIds.length === 0) return true;
  return ctx.branchIds.includes(branchId);
}
