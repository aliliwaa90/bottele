import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة تحكم VaultTap",
  description: "لوحة تحكم احترافية لإدارة منصة VaultTap"
};

const nav = [
  { href: "/", label: "الرئيسية" },
  { href: "/users", label: "المستخدمون" },
  { href: "/tasks", label: "المهام" },
  { href: "/events", label: "الأحداث" },
  { href: "/notifications", label: "الإذاعة" },
  { href: "/airdrop", label: "الإيردروب" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-8">
          <header className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold">لوحة تحكم VaultTap</h1>
                <p className="text-sm text-muted-foreground">
                  إدارة المستخدمين، المهام، الأحداث الخاصة، الإذاعة، ولقطات الإيردروب.
                </p>
              </div>
              <nav className="flex flex-wrap gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
