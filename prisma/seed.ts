/**
 * Seed: yetki katalogu + abonelik paketleri + Super Admin (her ortamda),
 * development ortaminda ayrica 3 demo firma ve demo kullanicilar.
 *
 * DIKKAT: Buradaki sifreler yalnizca gelistirme icindir.
 * Production'da SEED_SUPERADMIN_PASSWORD ortam degiskeni ile guclu bir sifre verin.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES, moduleOf } from "../src/lib/permissions";

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 12);

const PLANS = [
  { code: "TRIAL", name: "Deneme", priceMonthly: 0, maxUsers: 3, maxBranches: 1, maxWarehouses: 2, maxProducts: 200, sortOrder: 0 },
  { code: "BASIC", name: "Basic", priceMonthly: 990, maxUsers: 5, maxBranches: 2, maxWarehouses: 4, maxProducts: 2000, sortOrder: 1 },
  { code: "PRO", name: "Pro", priceMonthly: 2490, maxUsers: 20, maxBranches: 10, maxWarehouses: 30, maxProducts: 25000, sortOrder: 2 },
  { code: "ENTERPRISE", name: "Enterprise", priceMonthly: 7490, maxUsers: 200, maxBranches: 100, maxWarehouses: 300, maxProducts: 500000, sortOrder: 3 },
];

const DEMO_COMPANIES = [
  { name: "ABC GSM Telefon Aksesuar", shortName: "ABC GSM", slug: "abc-gsm", color: "#2563eb", plan: "PRO", branches: ["Gaziantep Merkez", "Istanbul Sube", "Ankara Sube"] },
  { name: "XYZ Aksesuar Ticaret", shortName: "XYZ Aksesuar", slug: "xyz-aksesuar", color: "#dc2626", plan: "BASIC", branches: ["Kilis Merkez", "Gaziantep Sube"] },
  { name: "Mega Telefon Market", shortName: "Mega Telefon", slug: "mega-telefon", color: "#059669", plan: "TRIAL", branches: ["Izmir Merkez"] },
];

async function seedPermissions() {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: { module: moduleOf(code), description: PERMISSIONS[code] },
      create: { code, module: moduleOf(code), description: PERMISSIONS[code] },
    });
  }
  console.log(`  ${ALL_PERMISSIONS.length} yetki hazir`);
}

async function seedPlans() {
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log(`  ${PLANS.length} paket hazir`);
}

async function seedSuperAdmin() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "admin@platform.local").toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "Admin!2345";
  const existing = await prisma.platformUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`  Super Admin zaten mevcut: ${email}`);
    return;
  }
  await prisma.platformUser.create({
    data: { email, fullName: "Platform Yoneticisi", passwordHash: await hash(password), role: "SUPER_ADMIN" },
  });
  console.log(`  Super Admin olusturuldu: ${email}`);
}

async function seedCompany(def: (typeof DEMO_COMPANIES)[number], index: number) {
  const existing = await prisma.company.findUnique({ where: { slug: def.slug } });
  if (existing) {
    console.log(`  ${def.name} zaten mevcut, atlaniyor`);
    return;
  }

  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: def.plan } });
  const permissions = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permIdByCode = new Map(permissions.map((p) => [p.code, p.id]));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: def.name,
        shortName: def.shortName,
        slug: def.slug,
        taxNumber: `12345678${index}0`,
        phone: `+90 342 000 00 0${index}`,
        email: `info@${def.slug}.local`,
        address: "Demo adres",
        status: def.plan === "TRIAL" ? "TRIAL" : "ACTIVE",
        planId: plan.id,
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + 14 * 86_400_000),
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
        maxWarehouses: plan.maxWarehouses,
        settings: { create: { primaryColor: def.color, receiptHeader: def.shortName } },
      },
    });

    await tx.subscription.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        status: def.plan === "TRIAL" ? "TRIAL" : "ACTIVE",
        startsAt: now,
        endsAt: new Date(now.getTime() + 365 * 86_400_000),
      },
    });

    // Roller
    const roleIdByCode = new Map<string, string>();
    for (const [code, roleDef] of Object.entries(SYSTEM_ROLES)) {
      const role = await tx.role.create({
        data: { companyId: company.id, code, name: roleDef.name.tr, isSystem: true },
      });
      roleIdByCode.set(code, role.id);
      const ids = (roleDef.permissions as readonly string[])
        .map((c) => permIdByCode.get(c))
        .filter((id): id is string => Boolean(id));
      await tx.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    // Subeler + depo + kasa
    const branchIds: string[] = [];
    for (const [i, branchName] of def.branches.entries()) {
      const branch = await tx.branch.create({
        data: {
          companyId: company.id,
          code: `SB-${String(i + 1).padStart(2, "0")}`,
          name: branchName,
          isDefault: i === 0,
          manager: "Demo Yetkili",
          phone: `+90 342 111 11 1${i}`,
        },
      });
      branchIds.push(branch.id);
      await tx.warehouse.create({
        data: { companyId: company.id, branchId: branch.id, code: `DP-${String(i + 1).padStart(2, "0")}`, name: `${branchName} Deposu`, isDefault: i === 0 },
      });
      await tx.cashRegister.create({
        data: { companyId: company.id, branchId: branch.id, code: `KS-${String(i + 1).padStart(2, "0")}`, name: `${branchName} Kasa`, isDefault: i === 0 },
      });
    }

    // Kullanicilar
    const password = await hash("Demo!2345");
    const users: { role: string; name: string; email: string; branches: string[]; discount?: number }[] = [
      { role: "ADMIN", name: "Firma Yoneticisi", email: `admin@${def.slug}.local`, branches: [] },
      { role: "MANAGER", name: "Operasyon Yoneticisi", email: `yonetici@${def.slug}.local`, branches: [], discount: 25 },
      { role: "BRANCH_MANAGER", name: "Sube Yoneticisi", email: `sube@${def.slug}.local`, branches: branchIds.slice(0, 1), discount: 15 },
      { role: "CASHIER", name: "Kasiyer Ahmet", email: `kasiyer@${def.slug}.local`, branches: branchIds.slice(0, 1), discount: 10 },
      { role: "WAREHOUSE", name: "Depo Personeli", email: `depo@${def.slug}.local`, branches: branchIds.slice(0, 1) },
      { role: "REPORTER", name: "Rapor Kullanicisi", email: `rapor@${def.slug}.local`, branches: [] },
    ];

    for (const u of users) {
      const created = await tx.user.create({
        data: {
          companyId: company.id,
          email: u.email,
          fullName: u.name,
          passwordHash: password,
          status: "ACTIVE",
          maxDiscountPercent: u.discount ?? null,
        },
      });
      const roleId = roleIdByCode.get(u.role);
      if (roleId) await tx.userRole.create({ data: { userId: created.id, roleId } });
      if (u.branches.length > 0) {
        await tx.userBranch.createMany({
          data: u.branches.map((branchId, i) => ({ userId: created.id, branchId, isPrimary: i === 0 })),
        });
      }
    }

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        actorType: "SYSTEM",
        action: "COMPANY_CREATED",
        entityType: "Company",
        entityId: company.id,
        newValue: { source: "seed", name: company.name },
      },
    });
  });

  console.log(`  ${def.name} olusturuldu (${def.branches.length} sube, 6 kullanici)`);
}

async function main() {
  console.log("Seed basliyor...");
  await seedPermissions();
  await seedPlans();
  await seedSuperAdmin();

  if (process.env.NODE_ENV === "production") {
    console.log("Production ortami: demo firmalar olusturulmadi.");
    return;
  }

  console.log("Demo firmalar:");
  for (const [i, def] of DEMO_COMPANIES.entries()) {
    await seedCompany(def, i + 1);
  }
  console.log("\nSeed tamamlandi. Development giris bilgileri README'de.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
