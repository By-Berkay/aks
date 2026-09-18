import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePlatform, requestMeta } from "@/lib/auth";
import { companyCreateSchema } from "@/modules/companies/schema";
import { createCompany, listCompanies } from "@/modules/companies/service";

export const runtime = "nodejs";

export const GET = handler(async (req: NextRequest) => {
  await requirePlatform();
  const sp = req.nextUrl.searchParams;
  return ok(
    await listCompanies({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      page: Math.max(1, Number(sp.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20))),
    }),
  );
});

export const POST = handler(async (req: NextRequest) => {
  const ctx = await requirePlatform();
  const input = companyCreateSchema.parse(await req.json());
  const company = await createCompany(ctx, input, await requestMeta());
  return ok({ id: company.id, name: company.name, slug: company.slug }, 201);
});
