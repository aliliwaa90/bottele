import { NextRequest, NextResponse } from "next/server";

import { ADMIN_AUTH_COOKIE, getAdminSessionValue, isValidAdminCredentials } from "@/lib/admin-auth";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as LoginBody;
  const username = payload.username?.trim() ?? "";
  const password = payload.password?.trim() ?? "";

  if (!isValidAdminCredentials(username, password)) {
    return NextResponse.json({ message: "بيانات الدخول غير صحيحة." }, { status: 401 });
  }

  const response = NextResponse.json({ message: "تم تسجيل الدخول بنجاح." });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: getAdminSessionValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });

  return response;
}
