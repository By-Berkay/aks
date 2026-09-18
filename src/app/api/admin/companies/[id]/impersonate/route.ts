import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { ok, handler, Errors } from "@/lib/api";
import { requirePlatform, readSession, requestMeta } from "@/lib/auth";
import { signSession } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { writeAudit, AuditActions } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Super Admin'in firma paneline gecisi. Her gecis audit'e yazilir. */
export const POST = handler(async (_req: NextRequest, { params }: Ctx) => {
  const ctx = await requirePlatform();
  const { id } = await params;

  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!company) throw Errors.notFound("Firma bulunamadi.");

  const token = await signSession(
    { sub: ctx.userId, type: "platform", actAsCompanyId: company.id, name: ctx.name, sid: randomUUID() },
    Number(process.env.SESSION_TTL_MINUTES ?? 480),
  );

  await writeAudit(ctx, {
    action: AuditActions.COMPANY_IMPERSONATION_STARTED,
    entityType: "Company",
    entityId: company.id,
    companyId: company.id,
    newValue: { note: "Super Admin tarafindan firma yonetim gorunumune gecildi" },
    ...(await requestMeta()),
  });

  const response = ok({ redirect: "/app", company: company.name });
  response.cookies.set({
    name: process.env.SESSION_COOKIE_NAME ?? "erp_session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(process.env.SESSION_TTL_MINUTES ?? 480) * 60,
  });
  return response;
});

/** Impersonation'i sonlandirir, platform paneline doner. */
export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  // Impersonation sirasinda context "company" gorunur; bu yuzden dogrudan token okunur.
  const session = await readSession();
  if (!session || session.type !== "platform") throw Errors.forbidden();
  const { id } = await params;

  const platformUser = await prisma.platformUser.findFirst({
    where: { id: session.sub, deletedAt: null, status: "ACTIVE" },
    select: { id: true, fullName: true },
  });
  if (!platformUser) throw Errors.unauthorized();

  const token = await signSession(
    { sub: platformUser.id, type: "platform", name: platformUser.fullName, sid: randomUUID() },
    Number(process.env.SESSION_TTL_MINUTES ?? 480),
  );

  await writeAudit(
    { kind: "platform", userId: platformUser.id, name: platformUser.fullName },
    {
      action: AuditActions.COMPANY_IMPERSONATION_ENDED,
      entityType: "Company",
      entityId: id,
      companyId: id,
      ...(await requestMeta()),
    },
  );

  const response = ok({ redirect: "/admin" });
  response.cookies.set({
    name: process.env.SESSION_COOKIE_NAME ?? "erp_session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(process.env.SESSION_TTL_MINUTES ?? 480) * 60,
  });
  return response;
});
