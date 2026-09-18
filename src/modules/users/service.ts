import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { hashPassword, isStrongPassword } from "@/lib/password";
import { writeAudit, AuditActions } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import type { UserCreateInput, UserUpdateInput } from "./schema";

type Meta = { ip?: string | null; userAgent?: string | null };

/**
 * Firma kullanicisi olusturur. companyId daima cagiranin context'inden gelir;
 * istemciden gelen companyId hicbir kosulda kullanilmaz.
 */
export async function createCompanyUser(
  ctx: AuthContext,
  companyId: string,
  input: UserCreateInput,
  meta: Meta,
) {
  if (!isStrongPassword(input.password)) {
    throw Errors.validation({ password: ["Sifre en az 8 karakter olmali, harf ve rakam icermeli."] });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true, maxUsers: true },
  });
  if (!company) throw Errors.notFound("Firma bulunamadi.");

  const userCount = await prisma.user.count({ where: { companyId, deletedAt: null } });
  if (userCount >= company.maxUsers) {
    throw Errors.limit(`Paket kullanici limitine ulasildi (${company.maxUsers}).`);
  }

  const role = await prisma.role.findUnique({
    where: { companyId_code: { companyId, code: input.roleCode } },
    select: { id: true },
  });
  if (!role) throw Errors.notFound("Rol bulunamadi.");

  const email = input.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { companyId, email, deletedAt: null } });
  if (existing) throw Errors.conflict("Bu e-posta ile bir kullanici zaten mevcut.");

  // Subelerin ayni tenant'a ait oldugunu dogrula (IDOR korumasi)
  if (input.branchIds.length > 0) {
    const valid = await prisma.branch.count({
      where: { id: { in: input.branchIds }, companyId, deletedAt: null },
    });
    if (valid !== input.branchIds.length) throw Errors.notFound("Sube bulunamadi.");
  }

  const overrides = input.permissionOverrides.length
    ? await prisma.permission.findMany({
        where: { code: { in: input.permissionOverrides.map((o) => o.code) } },
        select: { id: true, code: true },
      })
    : [];

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        companyId,
        email,
        username: input.username ? input.username.toLowerCase() : null,
        fullName: input.fullName.trim(),
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
        status: input.status,
        maxDiscountPercent: input.maxDiscountPercent ?? null,
      },
    });
    await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
    if (input.branchIds.length > 0) {
      await tx.userBranch.createMany({
        data: input.branchIds.map((branchId, index) => ({
          userId: created.id,
          branchId,
          isPrimary: index === 0,
        })),
      });
    }
    if (overrides.length > 0) {
      const effectByCode = new Map(input.permissionOverrides.map((o) => [o.code, o.effect]));
      await tx.userPermission.createMany({
        data: overrides.map((p) => ({
          userId: created.id,
          permissionId: p.id,
          effect: effectByCode.get(p.code) ?? "ALLOW",
        })),
      });
    }
    await writeAudit(
      ctx,
      {
        action: AuditActions.USER_CREATED,
        entityType: "User",
        entityId: created.id,
        companyId,
        newValue: { email: created.email, role: input.roleCode, status: created.status },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
    return created;
  });

  return { id: user.id, email: user.email, fullName: user.fullName, status: user.status };
}

export async function listCompanyUsers(companyId: string, params: { q?: string; page: number; pageSize: number }) {
  const where = {
    companyId,
    deletedAt: null,
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true,
        userRoles: { select: { role: { select: { code: true, name: true } } } },
        userBranches: { select: { branch: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function updateCompanyUser(
  ctx: AuthContext,
  companyId: string,
  userId: string,
  input: UserUpdateInput,
  meta: Meta,
) {
  const current = await prisma.user.findFirst({ where: { id: userId, companyId, deletedAt: null } });
  if (!current) throw Errors.notFound("Kullanici bulunamadi.");

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName ?? undefined,
        phone: input.phone !== undefined ? input.phone || null : undefined,
        status: input.status ?? undefined,
        maxDiscountPercent: input.maxDiscountPercent ?? undefined,
      },
    });
    if (input.roleCode) {
      const role = await tx.role.findUnique({
        where: { companyId_code: { companyId, code: input.roleCode } },
        select: { id: true },
      });
      if (!role) throw Errors.notFound("Rol bulunamadi.");
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({ data: { userId, roleId: role.id } });
    }
    if (input.branchIds) {
      const valid = await tx.branch.count({
        where: { id: { in: input.branchIds }, companyId, deletedAt: null },
      });
      if (valid !== input.branchIds.length) throw Errors.notFound("Sube bulunamadi.");
      await tx.userBranch.deleteMany({ where: { userId } });
      if (input.branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: input.branchIds.map((branchId, i) => ({ userId, branchId, isPrimary: i === 0 })),
        });
      }
    }
    await writeAudit(
      ctx,
      {
        action: AuditActions.USER_UPDATED,
        entityType: "User",
        entityId: userId,
        companyId,
        oldValue: { fullName: current.fullName, status: current.status },
        newValue: { fullName: u.fullName, status: u.status },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
    return u;
  });

  return { id: updated.id, fullName: updated.fullName, status: updated.status };
}

export async function resetUserPassword(
  ctx: AuthContext,
  companyId: string,
  userId: string,
  password: string,
  meta: Meta,
) {
  if (!isStrongPassword(password)) {
    throw Errors.validation({ password: ["Sifre en az 8 karakter olmali, harf ve rakam icermeli."] });
  }
  const user = await prisma.user.findFirst({ where: { id: userId, companyId, deletedAt: null } });
  if (!user) throw Errors.notFound("Kullanici bulunamadi.");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
  });
  // Sifre degeri asla audit'e yazilmaz.
  await writeAudit(ctx, {
    action: AuditActions.USER_PASSWORD_RESET,
    entityType: "User",
    entityId: userId,
    companyId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function softDeleteUser(ctx: AuthContext, companyId: string, userId: string, meta: Meta) {
  const user = await prisma.user.findFirst({ where: { id: userId, companyId, deletedAt: null } });
  if (!user) throw Errors.notFound("Kullanici bulunamadi.");
  if (ctx.kind === "company" && ctx.userId === userId) {
    throw Errors.forbidden("Kendi hesabinizi silemezsiniz.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), status: "PASSIVE", deletedBy: ctx.userId },
  });
  await writeAudit(ctx, {
    action: AuditActions.USER_DELETED,
    entityType: "User",
    entityId: userId,
    companyId,
    oldValue: { email: user.email },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}
