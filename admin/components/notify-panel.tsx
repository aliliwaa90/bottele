"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

export function NotifyPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "active">("all");
  const [status, setStatus] = useState("");

  const send = async () => {
    setStatus("جاري الإرسال...");
    try {
      const response = await adminApi.notify({ title, body, target });
      if (response.delivery && !response.delivery.skipped) {
        setStatus(
          `تم الإرسال. Telegram: ${response.delivery.delivered} ناجحة / ${response.delivery.failed} فاشلة.`
        );
      } else {
        setStatus("تم الإرسال داخل التطبيق فقط. إرسال Telegram غير مفعّل.");
      }
      setTitle("");
      setBody("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل إرسال الإذاعة.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>نظام الإذاعة الجماعية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان الإذاعة" />
        <textarea
          className="min-h-32 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="محتوى الرسالة"
        />
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as "all" | "active")}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">كل المستخدمين</option>
          <option value="active">المستخدمون النشطون</option>
        </select>
        <Button className="w-full" disabled={!title.trim() || !body.trim()} onClick={() => void send()}>
          إرسال الإذاعة
        </Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

