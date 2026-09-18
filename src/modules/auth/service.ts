import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/jwt";
import { Errors } from "@/lib/errors";
import { writeAudit, AuditActions } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { randomUUID } from "node:crypto";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

type LoginMeta = { ip?: string | null; userAgent?: string | null };

/**
 * Role-aware login: once platform kullanicisi, sonra firma kullanicisi aranir.
 * Basarisiz denemelerde ayni genel mesaj doner (kullanici sayimi engellenir).
 */
export async function login(identifier: string, password: string, meta: LoginMeta) {
  const value = identifier.trim().toLowerCase();

  const platformUser = await prisma.platformUser.findFirst({
    where: { email: value, deletedAt: null },
  });

  if (platformUser) {
    const okPass = platformUser.status === "ACTIVE" && (await verifyPassword(password, platformUser.passwordHash));
    await prisma.loginAttempt.create({
      data: { email: value, ip: meta.ip ?? null, success: okPass, reason: okPass ? null : "INVALID_CREDENTIALS" },
    });
    if (!okPass) throw Errors.forbidden("E-posta veya sifre hatali.");

    await prisma.platformUser.update({ where: { id: platformUser.id }, data: { lastLoginAt: new Date() } });
    const token = await signSession(
      { sub: platformUser.id, type: "platform", name: platformUser.fullName, sid: randomUUID() },
      Number(process.env.SESSION_TTL_MINUTES ?? 480),
    );
    await writeAudit(
      { kind: "platform", userId: platformUser.id, name: platformUser.fullName },
      { action: AuditActions.LOGIN_SUCCESS, entityType: "PlatformUser", entityId: platformUser.id, ip: meta.ip, userAgent: meta.userAgent },
    );
    return { token, redirect: "/admin" as const };
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: value }, { username: value }],
    },
    include: { company: { select: { id: true, name: true, status: true, deletedAt: true } } },
  });

  if (!user) {
    await prisma.loginAttempt.create({
      data: { email: value, ip: meta.ip ?? null, success: false, reason: "USER_NOT_FOUND" },
    });
    throw Errors.forbidden("E-posta veya sifre hatali.");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Errors.forbidden("Hesabiniz gecici olarak kilitlendi. Lutfen daha sonra tekrar deneyin.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    await prisma.loginAttempt.create({
      data: { email: value, ip: meta.ip ?? null, success: false, reason: "INVALID_PASSWORD" },
    });
    throw Errors.forbidden("E-posta veya sifre hatali.");
  }

  if (user.status !== "ACTIVE") throw Errors.forbidden("Hesabiniz aktif degil. Yoneticinizle iletisime gecin.");
  if (user.company.deletedAt) throw Errors.forbidden("Firma kaydi bulunamadi.");
  if (user.company.status === "SUSPENDED") {
    throw Errors.forbidden("Firma aboneligi askiya alinmistir. Lutfen platform yoneticinizle iletisime gecin.");
  }
  if (["EXPIRED", "CANCELLED"].includes(user.company.status)) {
    throw Errors.forbidden("Firma aboneliginin suresi dolmustur.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });
  await prisma.loginAttempt.create({ data: { email: value, ip: meta.ip ?? null, success: true } });

  const token = await signSession(
    { sub: user.id, type: "company", companyId: user.companyId, name: user.fullName, sid: randomUUID() },
    Number(process.env.SESSION_TTL_MINUTES ?? 480),
  );

  await writeAudit(
    { kind: "company", userId: user.id, name: user.fullName, companyId: user.companyId, permissions: new Set(), branchIds: [], maxDiscountPercent: null, impersonated: false },
    { action: AuditActions.LOGIN_SUCCESS, entityType: "User", entityId: user.id, companyId: user.companyId, ip: meta.ip, userAgent: meta.userAgent },
  );

  logger.info({ userId: user.id, companyId: user.companyId }, "Kullanici giris yapti");
  return { token, redirect: "/app" as const };
}
