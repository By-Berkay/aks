import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handler, Errors } from "@/lib/api";
import { login } from "@/modules/auth/service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(3).max(160),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional().default(false),
});

export const POST = handler(async (req: NextRequest) => {
  const ip = clientIp(req.headers);
  // Brute force korumasi: IP basina 10 deneme / 5 dakika
  if (!rateLimit(`login:${ip}`, 10, 5 * 60_000).allowed) throw Errors.tooMany();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Gonderilen bilgiler gecersiz.", 422, parsed.error.flatten());

  const { token, redirect } = await login(parsed.data.identifier, parsed.data.password, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  const ttlMinutes = Number(process.env.SESSION_TTL_MINUTES ?? 480);
  const response = ok({ redirect });
  response.cookies.set({
    name: process.env.SESSION_COOKIE_NAME ?? "erp_session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: parsed.data.remember ? 60 * 60 * 24 * 30 : ttlMinutes * 60,
  });
  return response;
});
