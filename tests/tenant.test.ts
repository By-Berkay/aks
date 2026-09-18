import { describe, expect, it } from "vitest";
import { tenantWhere, assertSameTenant, assertBranchAccess, canAccessBranch } from "@/lib/tenant";
import type { CompanyContext } from "@/lib/auth";

function ctx(overrides: Partial<CompanyContext> = {}): CompanyContext {
  return {
    kind: "company",
    userId: "user-a",
    name: "Test",
    companyId: "company-a",
    permissions: new Set(["sales.view"]),
    branchIds: [],
    maxDiscountPercent: null,
    impersonated: false,
    ...overrides,
  };
}

describe("TEST 1 / TEST 2 - tenant izolasyonu", () => {
  it("tenantWhere her sorguya companyId ekler", () => {
    expect(tenantWhere(ctx(), { barcode: "869" })).toEqual({
      barcode: "869",
      companyId: "company-a",
      deletedAt: null,
    });
  });

  it("istemciden gelen companyId context degerini ezemez", () => {
    const where = tenantWhere(ctx(), { companyId: "company-b" } as { companyId: string });
    expect(where.companyId).toBe("company-a");
  });

  it("baska firmanin kaydina erisim NOT_FOUND ile reddedilir", () => {
    expect(() => assertSameTenant(ctx(), { companyId: "company-b" })).toThrowError(/bulunamadi/i);
    expect(() => assertSameTenant(ctx(), null)).toThrowError(/bulunamadi/i);
  });

  it("ayni tenant kaydi gecerlidir", () => {
    expect(() => assertSameTenant(ctx(), { companyId: "company-a" })).not.toThrow();
  });
});

describe("TEST 15 / TEST 16 - sube kisiti", () => {
  it("sube atamasi olmayan kullanici firma genelini gorur", () => {
    expect(canAccessBranch(ctx(), "branch-x")).toBe(true);
  });

  it("sube atamasi olan kullanici baska subeyi goremez", () => {
    const user = ctx({ branchIds: ["branch-a"] });
    expect(canAccessBranch(user, "branch-a")).toBe(true);
    expect(canAccessBranch(user, "branch-b")).toBe(false);
    expect(() => assertBranchAccess(user, ["branch-b"])).toThrowError(/yetkiniz yok/i);
  });

  it("Super Admin goruntuleme modunda tum subelere erisir", () => {
    const admin = ctx({ branchIds: ["branch-a"], impersonated: true });
    expect(canAccessBranch(admin, "branch-z")).toBe(true);
  });
});
