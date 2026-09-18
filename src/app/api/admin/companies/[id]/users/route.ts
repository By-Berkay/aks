import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePlatform, requestMeta } from "@/lib/auth";
import { userCreateSchema } from "@/modules/users/schema";
import { createCompanyUser, listCompanyUsers } from "@/modules/users/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  await requirePlatform();
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  return ok(
    await listCompanyUsers(id, {
      q: sp.get("q") ?? undefined,
      page: Math.max(1, Number(sp.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20))),
    }),
  );
});

export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePlatform();
  const { id } = await params;
  const input = userCreateSchema.parse(await req.json());
  return ok(await createCompanyUser(ctx, id, input, await requestMeta()), 201);
});
