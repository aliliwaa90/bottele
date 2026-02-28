import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة تحكم VaultTap",
  description: "لوحة تحكم عربية متقدمة لإدارة منصة VaultTap."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
