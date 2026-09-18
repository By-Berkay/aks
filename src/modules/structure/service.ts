import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { writeAudit, AuditActions } from "@/lib/audit";
import type { AuthContext, CompanyContext } from "@/lib/auth";
import { tenantWhere } from "@/lib/tenant";
import type { BranchInput, WarehouseInput } from "./schema";

type Meta = { ip?: string | null; userAgent?: string | null };
const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);

export async function listBranches(ctx: CompanyContext) {
  const branches = await prisma.branch.findMany({
    where: tenantWhere(ctx),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { warehouses: true, cashRegisters: true, userBranches: true } } },
  });
  // Sube kisiti olan kullanici sadece kendi subelerini gorur.
  if (!ctx.impersonated && ctx.branchIds.length > 0) {
    return branches.filter((b) => ctx.branchIds.includes(b.id));
  }
  return branches;
}

export async function createBranch(ctx: AuthContext, companyId: string, input: BranchInput, meta: Meta) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true, maxBranches: true },
  });
  if (!company) throw Errors.notFound("Firma bulunamadi.");

  const count = await prisma.branch.count({ where: { companyId, deletedAt: null } });
  if (count >= company.maxBranches) {
    throw Errors.limit(`Paket sube limitine ulasildi (${company.maxBranches}).`);
  }

  const code = input.code.toUpperCase();
  const exists = await prisma.branch.findFirst({ where: { companyId, code } });
  if (exists) throw Errors.conflict("Bu sube kodu zaten kullaniliyor.");

  const branch = await prisma.branch.create({
    data: {
      companyId,
      code,
      name: input.name.trim(),
      phone: clean(input.phone),
      address: clean(input.address),
      manager: clean(input.manager),
      status: input.status,
    },
  });

  await writeAudit(ctx, {
    action: AuditActions.BRANCH_CREATED,
    entityType: "Branch",
    entityId: branch.id,
    companyId,
    newValue: { code: branch.code, name: branch.name },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return branch;
}

export async function updateBranch(
  ctx: AuthContext,
  companyId: string,
  branchId: string,
  input: Partial<BranchInput>,
  meta: Meta,
) {
  const current = await prisma.branch.findFirst({ where: { id: branchId, companyId, deletedAt: null } });
  if (!current) throw Errors.notFound("Sube bulunamadi.");

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: {
      name: input.name ?? undefined,
      phone: input.phone !== undefined ? clean(input.phone) : undefined,
      address: input.address !== undefined ? clean(input.address) : undefined,
      manager: input.manager !== undefined ? clean(input.manager) : undefined,
      status: input.status ?? undefined,
    },
  });

  await writeAudit(ctx, {
    action: AuditActions.BRANCH_UPDATED,
    entityType: "Branch",
    entityId: branchId,
    companyId,
    oldValue: { name: current.name, status: current.status },
    newValue: { name: updated.name, status: updated.status },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return updated;
}

export async function listWarehouses(ctx: CompanyContext) {
  return prisma.warehouse.findMany({
    where: tenantWhere(ctx),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { branch: { select: { id: true, name: true } } },
  });
}

export async function createWarehouse(ctx: AuthContext, companyId: string, input: WarehouseInput, meta: Meta) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { maxWarehouses: true },
  });
  if (!company) throw Errors.notFound("Firma bulunamadi.");

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!branch) throw Errors.notFound("Sube bulunamadi.");

  const count = await prisma.warehouse.count({ where: { companyId, deletedAt: null } });
  if (count >= company.maxWarehouses) {
    throw Errors.limit(`Paket depo limitine ulasildi (${company.maxWarehouses}).`);
  }

  const code = input.code.toUpperCase();
  const exists = await prisma.warehouse.findFirst({ where: { companyId, code } });
  if (exists) throw Errors.conflict("Bu depo kodu zaten kullaniliyor.");

  const warehouse = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.warehouse.updateMany({ where: { companyId }, data: { isDefault: false } });
    }
    const created = await tx.warehouse.create({
      data: { companyId, branchId: branch.id, code, name: input.name.trim(), isDefault: input.isDefault, status: input.status },
    });
    await writeAudit(
      ctx,
      {
        action: AuditActions.WAREHOUSE_CREATED,
        entityType: "Warehouse",
        entityId: created.id,
        companyId,
        newValue: { code: created.code, name: created.name, branchId: branch.id },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
    return created;
  });
  return warehouse;
}

export async function listCashRegisters(ctx: CompanyContext) {
  return prisma.cashRegister.findMany({
    where: tenantWhere(ctx),
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { branch: { select: { id: true, name: true } } },
  });
}

export async function createCashRegister(ctx: AuthContext, companyId: string, input: WarehouseInput, meta: Meta) {
  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!branch) throw Errors.notFound("Sube bulunamadi.");

  const code = input.code.toUpperCase();
  const exists = await prisma.cashRegister.findFirst({ where: { companyId, code } });
  if (exists) throw Errors.conflict("Bu kasa kodu zaten kullaniliyor.");

  const register = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.cashRegister.updateMany({ where: { companyId }, data: { isDefault: false } });
    }
    const created = await tx.cashRegister.create({
      data: { companyId, branchId: branch.id, code, name: input.name.trim(), isDefault: input.isDefault, status: input.status },
    });
    await writeAudit(
      ctx,
      {
        action: AuditActions.CASH_REGISTER_CREATED,
        entityType: "CashRegister",
        entityId: created.id,
        companyId,
        newValue: { code: created.code, name: created.name },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
    return created;
  });
  return register;
}
