import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

const COOKIE = process.env.SESSION_COOKIE_NAME ?? "erp_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/unauthorized"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Oturum bulunamadi." } },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isPlatform = session.type === "platform";
  const impersonating = isPlatform && Boolean(session.actAsCompanyId);

  // Firma kullanicisi Super Admin alanina giremez.
  if (pathname.startsWith("/admin") && !isPlatform) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
  // Platform kullanicisi firma paneline ancak impersonation ile girer.
  if (pathname.startsWith("/app") && isPlatform && !impersonating) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL(isPlatform && !impersonating ? "/admin" : "/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
