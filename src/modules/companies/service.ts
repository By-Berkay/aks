import { prisma } from "@/lib/prisma";
import { AppError, Errors } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/utils";
import { writeAudit, AuditActions } from "@/lib/audit";
import { SYSTEM_ROLES, ALL_PERMISSIONS } from "@/lib/permissions";
import type { PlatformContext } from "@/lib/auth";
import type { CompanyCreateInput, CompanyUpdateInput } from "./schema";

const clean = (v?: string | null) => (v && v.trim().length > 0 ? v.trim() : null);

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "firma";
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i}`;
    const exists = await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new AppError("CONFLICT", "Firma icin benzersiz bir adres uretilemedi.", 409);
}

/**
 * Firma olusturur ve varsayilan sube / depo / kasa / rolleri tek transaction icinde kurar.
 * Istege bagli olarak firma admin kullanicisini da olusturur.
 */
export async function createCompany(ctx: PlatformContext, input: CompanyCreateInput, meta: { ip?: string | null; userAgent?: string | null }) {
  const slug = await uniqueSlug(input.shortName || input.name);

  const plan = input.planCode
    ? await prisma.subscriptionPlan.findUnique({ where: { code: input.planCode } })
    : await prisma.subscriptionPlan.findUnique({ where: { code: "TRIAL" } });

  if (input.adminEmail && !input.adminPassword) {
    throw Errors.validation({ adminPassword: ["Yonetici sifresi zorunludur."] });
  }

  const trialStartsAt = new Date();
  const trialEndsAt = new Date(trialStartsAt.getTime() + input.trialDays * 86_400_000);

  const permissions = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permissionIdByCode = new Map(permissions.map((p) => [p.code, p.id]));
  if (permissionIdByCode.size === 0) {
    throw new AppError("SEED_REQUIRED", "Yetki katalogu bos. Once `npm run db:seed` calistirin.", 500);
  }

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name: input.name.trim(),
        shortName: input.shortName.trim(),
        slug,
        taxNumber: clean(input.taxNumber),
        taxOffice: clean(input.taxOffice),
        phone: clean(input.phone),
        email: clean(input.email),
        address: clean(input.address),
        website: clean(input.website),
        logoUrl: clean(input.logoUrl),
        currency: input.currency,
        country: input.country,
        locale: input.locale,
        status: input.status,
        trialStartsAt,
        trialEndsAt,
        planId: plan?.id,
        maxUsers: input.maxUsers ?? plan?.maxUsers ?? 3,
        maxBranches: input.maxBranches ?? plan?.maxBranches ?? 1,
        maxWarehouses: input.maxWarehouses ?? plan?.maxWarehouses ?? 2,
        settings: { create: { primaryColor: input.primaryColor } },
      },
    });

    if (plan) {
      await tx.subscription.create({
        data: {
          companyId: created.id,
          planId: plan.id,
          status: input.status === "ACTIVE" ? "ACTIVE" : "TRIAL",
          startsAt: trialStartsAt,
          endsAt: trialEndsAt,
        },
      });
    }

    // Varsayilan sube / depo / kasa
    const branch = await tx.branch.create({
      data: { companyId: created.id, code: "MERKEZ", name: "Merkez Sube", isDefault: true },
    });
    await tx.warehouse.create({
      data: { companyId: created.id, branchId: branch.id, code: "ANA-DEPO", name: "Ana Depo", isDefault: true },
    });
    await tx.cashRegister.create({
      data: { companyId: created.id, branchId: branch.id, code: "KASA-01", name: "Kasa 01", isDefault: true },
    });

    // Sistem rolleri
    for (const [code, def] of Object.entries(SYSTEM_ROLES)) {
      const role = await tx.role.create({
        data: {
          companyId: created.id,
          code,
          name: def.name[input.locale as "tr" | "en"] ?? def.name.tr,
          isSystem: true,
        },
      });
      const ids = (def.permissions as readonly string[])
        .map((c) => permissionIdByCode.get(c))
        .filter((id): id is string => Boolean(id));
      if (ids.length > 0) {
        await tx.rolePermission.createMany({
          data: ids.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }
      if (code === "ADMIN" && input.adminEmail && input.adminPassword) {
        const user = await tx.user.create({
          data: {
            companyId: created.id,
            email: input.adminEmail.toLowerCase(),
            fullName: input.adminFullName ?? input.adminEmail,
            passwordHash: await hashPassword(input.adminPassword),
            status: "ACTIVE",
          },
        });
        await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
        await tx.userBranch.create({ data: { userId: user.id, branchId: branch.id, isPrimary: true } });
      }
    }

    await writeAudit(
      ctx,
      {
        action: AuditActions.COMPANY_CREATED,
        entityType: "Company",
        entityId: created.id,
        companyId: created.id,
        newValue: { name: created.name, status: created.status, slug: created.slug },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );

    return created;
  });

  return company;
}

export async function listCompanies(params: { q?: string; status?: string; page: number; pageSize: number }) {
  const where = {
    deletedAt: null,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" as const } },
            { shortName: { contains: params.q, mode: "insensitive" as const } },
            { taxNumber: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        plan: { select: { code: true, name: true } },
        _count: { select: { users: true, branches: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getCompany(id: string) {
  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    include: {
      plan: true,
      settings: true,
      branches: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, branches: true, warehouses: true, cashRegisters: true } },
    },
  });
  if (!company) throw Errors.notFound("Firma bulunamadi.");
  return company;
}

export async function updateCompany(
  ctx: PlatformContext,
  id: string,
  input: CompanyUpdateInput,
  meta: { ip?: string | null; userAgent?: string | null },
) {
  const current = await prisma.company.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw Errors.notFound("Firma bulunamadi.");

  const updated = await prisma.company.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      shortName: input.shortName ?? undefined,
      taxNumber: input.taxNumber !== undefined ? clean(input.taxNumber) : undefined,
      taxOffice: input.taxOffice !== undefined ? clean(input.taxOffice) : undefined,
      phone: input.phone !== undefined ? clean(input.phone) : undefined,
      email: input.email !== undefined ? clean(input.email) : undefined,
      address: input.address !== undefined ? clean(input.address) : undefined,
      website: input.website !== undefined ? clean(input.website) : undefined,
      logoUrl: input.logoUrl !== undefined ? clean(input.logoUrl) : undefined,
      currency: input.currency ?? undefined,
      locale: input.locale ?? undefined,
      status: input.status ?? undefined,
      maxUsers: input.maxUsers ?? undefined,
      maxBranches: input.maxBranches ?? undefined,
      maxWarehouses: input.maxWarehouses ?? undefined,
    },
  });

  if (input.primaryColor) {
    await prisma.companySettings.update({
      where: { companyId: id },
      data: { primaryColor: input.primaryColor },
    });
  }

  await writeAudit(ctx, {
    action:
      input.status && input.status !== current.status
        ? AuditActions.COMPANY_STATUS_CHANGED
        : AuditActions.COMPANY_UPDATED,
    entityType: "Company",
    entityId: id,
    companyId: id,
    oldValue: { name: current.name, status: current.status },
    newValue: { name: updated.name, status: updated.status },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

/** Firmalar fiziksel olarak silinmez; soft delete + pasife alinir. */
export async function softDeleteCompany(
  ctx: PlatformContext,
  id: string,
  reason: string | undefined,
  meta: { ip?: string | null; userAgent?: string | null },
) {
  const company = await prisma.company.findFirst({ where: { id, deletedAt: null } });
  if (!company) throw Errors.notFound("Firma bulunamadi.");

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: ctx.userId, status: "CANCELLED" },
    });
    await tx.user.updateMany({ where: { companyId: id, deletedAt: null }, data: { status: "PASSIVE" } });
    await writeAudit(
      ctx,
      {
        action: AuditActions.COMPANY_DELETED,
        entityType: "Company",
        entityId: id,
        companyId: id,
        oldValue: { name: company.name, status: company.status },
        newValue: { reason: reason ?? null },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
  });
}

export async function platformStats() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalCompanies, activeCompanies, trialCompanies, suspendedCompanies,
    totalUsers, activeUsers, totalBranches, todayActivity, recentCompanies, growthRaw,
  ] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.company.count({ where: { deletedAt: null, status: "TRIAL" } }),
    prisma.company.count({ where: { deletedAt: null, status: { in: ["SUSPENDED", "EXPIRED"] } } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.auditLog.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const growthMap = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    growthMap.set(d, 0);
  }
  for (const row of growthRaw) {
    const key = row.createdAt.toISOString().slice(0, 10);
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }

  return {
    totalCompanies, activeCompanies, trialCompanies, suspendedCompanies,
    totalUsers, activeUsers, totalBranches, todayActivity, recentCompanies,
    growth: [...growthMap.entries()].map(([date, count]) => ({ date, count })),
  };
}

export { ALL_PERMISSIONS };
