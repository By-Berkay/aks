import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { branchSchema } from "@/modules/structure/schema";
import { createBranch, listBranches } from "@/modules/structure/service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const ctx = await requirePermission("branches.view");
  return ok(await listBranches(ctx));
});

export const POST = handler(async (req: NextRequest) => {
  const ctx = await requirePermission("branches.manage");
  const input = branchSchema.parse(await req.json());
  // companyId context'ten gelir, istemciden degil.
  return ok(await createBranch(ctx, ctx.companyId, input, await requestMeta()), 201);
});
