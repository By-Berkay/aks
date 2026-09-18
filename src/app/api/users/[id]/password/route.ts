import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { passwordResetSchema } from "@/modules/users/schema";
import { resetUserPassword } from "@/modules/users/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePermission("users.edit");
  const { id } = await params;
  const { password } = passwordResetSchema.parse(await req.json());
  await resetUserPassword(ctx, ctx.companyId, id, password, await requestMeta());
  return ok({ updated: true });
});
