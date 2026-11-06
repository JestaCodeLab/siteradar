import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that need a signed-in person. This only checks that a session cookie exists: the Flask API validates it on
// every request, and the app sends people to the right place (login, onboarding) from /api/auth/me.
const PRIVATE = ["/overview", "/websites", "/reports", "/subscriptions", "/settings", "/activity", "/team", "/billing", "/onboarding", "/admin"];

/** Requests to the API carry the visitor's real address and a shared secret, so the API can rate-limit the right person. Only this
 * proxy can send them: anything a visitor puts in those headers is thrown away first. Set the same PROXY_SECRET here and on the API. */
function forApi(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-siteradar-proxy");
  headers.delete("x-siteradar-client-ip");
  const secret = process.env.PROXY_SECRET;
  if (secret) {
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) { headers.set("x-siteradar-proxy", secret); headers.set("x-siteradar-client-ip", ip); }
  }
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname === "/collect") return forApi(request);
  const signedIn = request.cookies.has("session");
  const { pathname } = request.nextUrl;
  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|t\\.js|favicon\\.ico).*)"],
};
