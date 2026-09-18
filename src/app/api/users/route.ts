import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePermission, requestMeta } from "@/lib/auth";
import { userCreateSchema } from "@/modules/users/schema";
import { createCompanyUser, listCompanyUsers } from "@/modules/users/service";

export const runtime = "nodejs";

export const GET = handler(async (req: NextRequest) => {
  const ctx = await requirePermission("users.view");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listCompanyUsers(ctx.companyId, {
      q: sp.get("q") ?? undefined,
      page: Math.max(1, Number(sp.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20))),
    }),
  );
});

export const POST = handler(async (req: NextRequest) => {
  const ctx = await requirePermission("users.create");
  const input = userCreateSchema.parse(await req.json());
  // Firma Admin'i sadece kendi tenant'inda kullanici olusturabilir.
  return ok(await createCompanyUser(ctx, ctx.companyId, input, await requestMeta()), 201);
});
