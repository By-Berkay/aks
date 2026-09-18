import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { warehouseSchema } from "@/modules/structure/schema";
import { createWarehouse, listWarehouses } from "@/modules/structure/service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const ctx = await requirePermission("warehouses.view");
  return ok(await listWarehouses(ctx));
});

export const POST = handler(async (req: NextRequest) => {
  const ctx = await requirePermission("warehouses.manage");
  const input = warehouseSchema.parse(await req.json());
  return ok(await createWarehouse(ctx, ctx.companyId, input, await requestMeta()), 201);
});
