"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("alifakarr");
  const [password, setPassword] = useState("Aliliwaa00");
  const [nextPath, setNextPath] = useState("/");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.message || "فشل تسجيل الدخول.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setStatus("تعذر الاتصال بالخادم، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-sky-200/70 bg-white/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">VaultTap Admin</p>
        <CardTitle className="text-2xl font-extrabold">تسجيل دخول لوحة التحكم</CardTitle>
        <p className="text-sm text-muted-foreground">أدخل بيانات الإدارة للوصول إلى مركز التحكم الكامل.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="اسم المستخدم" />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="كلمة المرور"
          />
          <Button className="h-11 w-full bg-sky-600 text-base font-bold hover:bg-sky-700" disabled={loading}>
            {loading ? "جارٍ التحقق..." : "دخول"}
          </Button>
        </form>
        {status ? <p className="mt-3 text-sm text-red-600">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
