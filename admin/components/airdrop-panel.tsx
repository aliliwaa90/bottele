"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

export function AirdropPanel() {
  const [batchTag, setBatchTag] = useState(`batch-${new Date().toISOString().slice(0, 10)}`);
  const [status, setStatus] = useState("");

  const create = async () => {
    setStatus("جاري إنشاء اللقطة...");
    try {
      const result = await adminApi.createSnapshot(batchTag);
      setStatus(`${result.message} (عدد السجلات: ${result.count})`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل إنشاء اللقطة.");
    }
  };

  const exportUsers = () => {
    const url = "/api/proxy/admin/export/users.xlsx";
    fetch(url, {
      headers: {}
    })
      .then((res) => res.blob())
      .then((blob) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "vaulttap-users.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      })
      .catch(() => setStatus("فشل تصدير ملف المستخدمين."));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>لقطة الإيردروب + تصدير Excel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={batchTag} onChange={(event) => setBatchTag(event.target.value)} placeholder="وسم الدفعة Batch Tag" />
        <Button className="w-full" onClick={() => void create()}>
          إنشاء لقطة
        </Button>
        <Button variant="outline" className="w-full" onClick={exportUsers}>
          تصدير المستخدمين Excel
        </Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
