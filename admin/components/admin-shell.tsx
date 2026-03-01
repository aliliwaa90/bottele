"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "الرئيسية" },
  { href: "/users", label: "المستخدمون" },
  { href: "/upgrades", label: "الترقيات" },
  { href: "/tasks", label: "المهام" },
  { href: "/events", label: "الأحداث" },
  { href: "/notifications", label: "الإذاعة" },
  { href: "/airdrop", label: "الإيردروب" }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoginPage = pathname === "/login";

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoginPage) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,.2),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(14,116,144,.2),_transparent_45%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 md:px-8">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-8" dir="rtl">
      <header className="mb-6 overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-700 p-5 text-white shadow-2xl shadow-sky-900/25">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">VaultTap Control Center</h1>
            <p className="mt-1 text-sm text-sky-100 md:text-base">
              إدارة ذكية للمستخدمين والمهام والأحداث والإذاعات والترقيات المدفوعة بالنجوم.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loggingOut}
            onClick={() => void logout()}
            className="border-0 bg-white/95 font-bold text-sky-700 hover:bg-white"
          >
            {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل خروج"}
          </Button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                active
                  ? "border-sky-300 bg-sky-600 text-white shadow-lg shadow-sky-200"
                  : "border-border bg-card hover:border-sky-200 hover:bg-sky-50"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="pb-10">{children}</main>
    </div>
  );
}
