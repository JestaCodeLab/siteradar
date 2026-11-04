import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only checks that a session cookie exists. The Flask API validates it on every request
// and the client sends the person back to /login when it answers 401.
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has("session");
  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/websites", request.url)) : NextResponse.next();
  }
  return signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api|_next|t\\.js|collect|favicon\\.ico).*)"],
};
