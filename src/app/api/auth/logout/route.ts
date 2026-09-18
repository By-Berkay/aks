import { ok, handler } from "@/lib/api";
import { getAuthContext, requestMeta } from "@/lib/auth";
import { writeAudit, AuditActions } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handler(async () => {
  const ctx = await getAuthContext();
  const meta = await requestMeta();
  if (ctx) await writeAudit(ctx, { action: AuditActions.LOGOUT, ...meta });

  const response = ok({ redirect: "/login" });
  response.cookies.set({
    name: process.env.SESSION_COOKIE_NAME ?? "erp_session",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
});
