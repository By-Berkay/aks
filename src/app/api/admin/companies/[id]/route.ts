import { NextRequest } from "next/server";
import { ok, handler } from "@/lib/api";
import { requirePlatform, requestMeta } from "@/lib/auth";
import { companyUpdateSchema } from "@/modules/companies/schema";
import { getCompany, updateCompany, softDeleteCompany } from "@/modules/companies/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  await requirePlatform();
  const { id } = await params;
  return ok(await getCompany(id));
});

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePlatform();
  const { id } = await params;
  const input = companyUpdateSchema.parse(await req.json());
  return ok(await updateCompany(ctx, id, input, await requestMeta()));
});

export const DELETE = handler(async (req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePlatform();
  const { id } = await params;
  const reason = req.nextUrl.searchParams.get("reason") ?? undefined;
  await softDeleteCompany(ctx, id, reason, await requestMeta());
  return ok({ deleted: true });
});
