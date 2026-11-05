import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that need a signed-in person. This only checks that a session cookie exists: the Flask API validates it on
// every request, and the app sends people to the right place (login, onboarding) from /api/auth/me.
const PRIVATE = ["/overview", "/websites", "/subscriptions", "/settings", "/activity", "/team", "/billing", "/onboarding", "/admin"];

export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has("session");
  const { pathname } = request.nextUrl;
  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|t\\.js|collect|favicon\\.ico).*)"],
};
