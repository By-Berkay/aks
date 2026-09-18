import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { cashRegisterSchema } from "@/modules/structure/schema";
import { createCashRegister, listCashRegisters } from "@/modules/structure/service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const ctx = await requirePermission("cashregisters.view");
  return ok(await listCashRegisters(ctx));
});

export const POST = handler(async (req: NextRequest) => {
  const ctx = await requirePermission("cashregisters.manage");
  const input = cashRegisterSchema.parse(await req.json());
  return ok(await createCashRegister(ctx, ctx.companyId, input, await requestMeta()), 201);
});
