import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { userUpdateSchema } from "@/modules/users/schema";
import { softDeleteUser, updateCompanyUser } from "@/modules/users/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePermission("users.edit");
  const { id } = await params;
  const input = userUpdateSchema.parse(await req.json());
  return ok(await updateCompanyUser(ctx, ctx.companyId, id, input, await requestMeta()));
});

export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePermission("users.delete");
  const { id } = await params;
  await softDeleteUser(ctx, ctx.companyId, id, await requestMeta());
  return ok({ deleted: true });
});
