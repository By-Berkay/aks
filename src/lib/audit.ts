import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AuthContext } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  companyId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Append-only audit kaydi. Audit yazimi asla ana islemi dusurmez,
 * ancak transaction icinde cagrilirsa transaction'a dahil olur.
 */
export async function writeAudit(
  ctx: AuthContext | null,
  input: AuditInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const isCompanyCtx = ctx?.kind === "company";
  try {
    await client.auditLog.create({
      data: {
        companyId: input.companyId ?? (isCompanyCtx ? ctx.companyId : null),
        actorType: ctx ? (ctx.kind === "platform" ? "PLATFORM_USER" : "COMPANY_USER") : "SYSTEM",
        actorId: ctx?.userId ?? null,
        actorName: ctx?.name ?? null,
        impersonated: isCompanyCtx ? ctx.impersonated : false,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: (input.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (input.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch (err) {
    if (tx) throw err;
    logger.error({ err, action: input.action }, "Audit log yazilamadi");
  }
}

export const AuditActions = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  COMPANY_CREATED: "COMPANY_CREATED",
  COMPANY_UPDATED: "COMPANY_UPDATED",
  COMPANY_DELETED: "COMPANY_DELETED",
  COMPANY_STATUS_CHANGED: "COMPANY_STATUS_CHANGED",
  COMPANY_IMPERSONATION_STARTED: "COMPANY_IMPERSONATION_STARTED",
  COMPANY_IMPERSONATION_ENDED: "COMPANY_IMPERSONATION_ENDED",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  BRANCH_CREATED: "BRANCH_CREATED",
  BRANCH_UPDATED: "BRANCH_UPDATED",
  WAREHOUSE_CREATED: "WAREHOUSE_CREATED",
  CASH_REGISTER_CREATED: "CASH_REGISTER_CREATED",
  ROLE_UPDATED: "ROLE_UPDATED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
} as const;
