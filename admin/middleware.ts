import { NextRequest, NextResponse } from "next/server";

import { ADMIN_AUTH_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

const LOGIN_PATH = "/login";
const PUBLIC_API_PATHS = new Set(["/api/auth/login"]);

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || /\.[^/]+$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  const loggedIn = isValidAdminSession(session);

  if (pathname === LOGIN_PATH) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!loggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const next = `${pathname}${search}`;
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
