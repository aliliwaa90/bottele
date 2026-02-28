import { NextRequest, NextResponse } from "next/server";

import { ADMIN_AUTH_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
const adminToken = process.env.ADMIN_TOKEN ?? "";

function buildTarget(path: string[], search: string): string {
  const cleanPath = path.join("/");
  return `${backendUrl}/api/${cleanPath}${search}`;
}

async function forward(request: NextRequest, method: "GET" | "POST") {
  const session = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.pathname.split("/").slice(3);
  const target = buildTarget(path, request.nextUrl.search);
  const body = method === "POST" ? await request.text() : undefined;

  const response = await fetch(target, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "content-disposition": response.headers.get("content-disposition") ?? ""
    }
  });
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function POST(request: NextRequest) {
  return forward(request, "POST");
}
