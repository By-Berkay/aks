// Edge runtime (middleware) ile uyumlu JWT katmani - jose kullanir.
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  /** PlatformUser.id veya User.id */
  sub: string;
  type: "platform" | "company";
  /** company kullanicilari icin tenant; platform kullanicisi icin undefined */
  companyId?: string;
  /** Super Admin bir firmayi goruntulerken doldurulur (impersonation) */
  actAsCompanyId?: string;
  name: string;
  sid: string;
};

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET tanimli degil veya cok kisa");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload, ttlMinutes: number): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("erp-pos")
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "erp-pos" });
    if (typeof payload.sub !== "string" || typeof payload.type !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
