import { ok, handler } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const ctx = await requireAuth();
  if (ctx.kind === "platform") {
    return ok({ kind: "platform", userId: ctx.userId, name: ctx.name });
  }
  return ok({
    kind: "company",
    userId: ctx.userId,
    name: ctx.name,
    companyId: ctx.companyId,
    impersonated: ctx.impersonated,
    permissions: [...ctx.permissions],
    branchIds: ctx.branchIds,
  });
});
