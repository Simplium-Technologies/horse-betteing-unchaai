import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  const protectedPaths = ["/dashboard", "/complete-profile", "/admin", "/races", "/leaderboard"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authPages = ["/login", "/verify-otp"];
  const isAuthPage = authPages.some((p) => pathname.startsWith(p));

  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/complete-profile",
    "/admin/:path*",
    "/races/:path*",
    "/leaderboard",
    "/login",
    "/verify-otp",
  ],
};
