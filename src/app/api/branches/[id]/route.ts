import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { branchSchema } from "@/modules/structure/schema";
import { updateBranch } from "@/modules/structure/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePermission("branches.manage");
  const { id } = await params;
  const input = branchSchema.partial().parse(await req.json());
  return ok(await updateBranch(ctx, ctx.companyId, id, input, await requestMeta()));
});
