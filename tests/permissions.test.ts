import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, SYSTEM_ROLES, resolvePermissions, moduleOf } from "@/lib/permissions";

describe("yetki katalogu", () => {
  it("yetki kodlari benzersizdir", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it("her rol yetkisi katalogda tanimlidir", () => {
    for (const [code, role] of Object.entries(SYSTEM_ROLES)) {
      for (const perm of role.permissions as readonly string[]) {
        expect(ALL_PERMISSIONS, `${code} -> ${perm}`).toContain(perm);
      }
    }
  });

  it("modul adini kodundan cikarir", () => {
    expect(moduleOf("sales.discount.override")).toBe("sales");
  });
});

describe("TEST 3 / TEST 4 - kasiyer kisitlari", () => {
  const cashier = SYSTEM_ROLES.CASHIER.permissions as readonly string[];

  it("kasiyer urun fiyati degistiremez", () => {
    expect(cashier).not.toContain("products.price_edit");
    expect(cashier).not.toContain("products.edit");
  });

  it("kasiyer indirim limiti asma onayi veremez", () => {
    expect(cashier).not.toContain("sales.discount.override");
  });

  it("kasiyer kullanici ve ayar yonetemez", () => {
    expect(cashier).not.toContain("users.create");
    expect(cashier).not.toContain("settings.edit");
  });
});

describe("TEST 5 - yonetici onayi", () => {
  it("yonetici indirim limitini asma yetkisine sahiptir", () => {
    expect(SYSTEM_ROLES.MANAGER.permissions as readonly string[]).toContain("sales.discount.override");
    expect(SYSTEM_ROLES.BRANCH_MANAGER.permissions as readonly string[]).toContain("sales.discount.override");
  });
});

describe("kullanici bazli override", () => {
  it("ALLOW override rol yetkisine ekler", () => {
    const result = resolvePermissions({ rolePermissions: ["sales.view"], userAllow: ["sales.discount"] });
    expect(result.has("sales.discount")).toBe(true);
  });

  it("DENY override rol yetkisini keser ve ALLOW'a gore onceliklidir", () => {
    const result = resolvePermissions({
      rolePermissions: ["sales.view", "sales.create"],
      userAllow: ["sales.cancel"],
      userDeny: ["sales.create", "sales.cancel"],
    });
    expect(result.has("sales.create")).toBe(false);
    expect(result.has("sales.cancel")).toBe(false);
    expect(result.has("sales.view")).toBe(true);
  });
});
