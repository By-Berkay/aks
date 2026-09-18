// ---------------------------------------------------------------------------
// Yetki katalogu ve rol on tanimlari. Tek kaynak burasi; seed bu listeden uretir.
// ---------------------------------------------------------------------------

export const PERMISSIONS = {
  // Satis
  "sales.view": "Satislari goruntule",
  "sales.create": "Satis yap",
  "sales.cancel": "Satis iptal et",
  "sales.return": "Iade yap",
  "sales.discount": "Indirim uygula",
  "sales.discount.override": "Indirim limitini asma onayi ver",
  // Urun
  "products.view": "Urunleri goruntule",
  "products.create": "Urun olustur",
  "products.edit": "Urun duzenle",
  "products.delete": "Urun sil",
  "products.price_edit": "Urun fiyati degistir",
  // Stok
  "stock.view": "Stok goruntule",
  "stock.adjust": "Stok duzeltme",
  "stock.count": "Stok sayimi",
  "stock.transfer": "Stok transferi",
  // Alis
  "purchases.view": "Alislari goruntule",
  "purchases.create": "Alis olustur",
  "purchases.cancel": "Alis iptal et",
  // Cari
  "customers.view": "Musterileri goruntule",
  "customers.create": "Musteri olustur",
  "customers.edit": "Musteri duzenle",
  "suppliers.view": "Tedarikcileri goruntule",
  "suppliers.create": "Tedarikci olustur",
  "suppliers.edit": "Tedarikci duzenle",
  // Kasa
  "cash.view": "Kasa goruntule",
  "cash.open": "Kasa ac",
  "cash.close": "Kasa kapat",
  "cash.in": "Kasa giris",
  "cash.out": "Kasa cikis",
  "cash.expense": "Gider girisi",
  // Raporlar
  "reports.view": "Raporlari goruntule",
  "reports.sales": "Satis raporu",
  "reports.stock": "Stok raporu",
  "reports.profit": "Karlilik raporu",
  "reports.export": "Rapor disa aktar",
  // Yonetim
  "users.view": "Kullanicilari goruntule",
  "users.create": "Kullanici olustur",
  "users.edit": "Kullanici duzenle",
  "users.delete": "Kullanici sil",
  "roles.view": "Rolleri goruntule",
  "roles.manage": "Rol ve yetki yonet",
  "branches.view": "Subeleri goruntule",
  "branches.manage": "Sube yonet",
  "warehouses.view": "Depolari goruntule",
  "warehouses.manage": "Depo yonet",
  "cashregisters.view": "Kasalari goruntule",
  "cashregisters.manage": "Kasa tanimi yonet",
  "settings.view": "Ayarlari goruntule",
  "settings.edit": "Ayarlari duzenle",
  "audit.view": "Audit log goruntule",
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionCode[];

export function moduleOf(code: string): string {
  return code.split(".")[0] ?? "misc";
}

export const SYSTEM_ROLES = {
  ADMIN: {
    name: { tr: "Firma Yoneticisi", en: "Company Admin" },
    permissions: ALL_PERMISSIONS,
  },
  MANAGER: {
    name: { tr: "Yonetici", en: "Manager" },
    permissions: ALL_PERMISSIONS.filter(
      (p) => !["users.delete", "roles.manage", "settings.edit"].includes(p),
    ),
  },
  BRANCH_MANAGER: {
    name: { tr: "Sube Yoneticisi", en: "Branch Manager" },
    permissions: [
      "sales.view", "sales.create", "sales.cancel", "sales.return", "sales.discount",
      "sales.discount.override", "products.view", "stock.view", "stock.adjust",
      "stock.count", "stock.transfer", "purchases.view", "customers.view",
      "customers.create", "customers.edit", "suppliers.view", "cash.view",
      "cash.open", "cash.close", "cash.in", "cash.out", "cash.expense",
      "reports.view", "reports.sales", "reports.stock", "users.view",
      "branches.view", "warehouses.view", "cashregisters.view",
    ] as PermissionCode[],
  },
  CASH_SUPERVISOR: {
    name: { tr: "Kasa Sorumlusu", en: "Cash Supervisor" },
    permissions: [
      "sales.view", "sales.create", "sales.return", "sales.discount",
      "products.view", "stock.view", "customers.view", "customers.create",
      "cash.view", "cash.open", "cash.close", "cash.in", "cash.out",
      "cash.expense", "reports.view", "reports.sales",
    ] as PermissionCode[],
  },
  CASHIER: {
    name: { tr: "Kasiyer", en: "Cashier" },
    permissions: [
      "sales.view", "sales.create", "products.view", "stock.view",
      "customers.view", "customers.create", "cash.view",
    ] as PermissionCode[],
  },
  WAREHOUSE: {
    name: { tr: "Depo Personeli", en: "Warehouse Staff" },
    permissions: [
      "products.view", "stock.view", "stock.count", "stock.transfer",
      "purchases.view", "suppliers.view",
    ] as PermissionCode[],
  },
  REPORTER: {
    name: { tr: "Rapor Kullanicisi", en: "Report User" },
    permissions: [
      "reports.view", "reports.sales", "reports.stock", "reports.profit",
      "reports.export", "products.view", "stock.view", "sales.view",
    ] as PermissionCode[],
  },
} as const;

export type SystemRoleCode = keyof typeof SYSTEM_ROLES;

/**
 * Etkin yetkileri hesaplar: rol yetkileri + kullanici ALLOW override'lari,
 * eksi kullanici DENY override'lari. DENY her zaman kazanir.
 */
export function resolvePermissions(input: {
  rolePermissions: string[];
  userAllow?: string[];
  userDeny?: string[];
}): Set<string> {
  const result = new Set(input.rolePermissions);
  for (const p of input.userAllow ?? []) result.add(p);
  for (const p of input.userDeny ?? []) result.delete(p);
  return result;
}
