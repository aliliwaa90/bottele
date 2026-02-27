"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

type TaskItem = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  reward: number;
  type: string;
};

export function TasksManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    key: "",
    titleAr: "",
    titleEn: "",
    type: "DAILY",
    reward: "500",
    link: "",
    isDaily: true,
    isActive: true
  });

  const load = async () => {
    const data = await adminApi.tasks();
    setTasks(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    setStatus("جاري الحفظ...");
    try {
      await adminApi.upsertTask({
        key: form.key,
        titleAr: form.titleAr,
        titleEn: form.titleEn,
        type: form.type,
        reward: Number(form.reward),
        link: form.link || undefined,
        isDaily: form.isDaily,
        isActive: form.isActive
      });
      setStatus("تم حفظ المهمة بنجاح.");
      setForm((prev) => ({ ...prev, key: "", titleAr: "", titleEn: "", link: "" }));
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل حفظ المهمة.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>المهام الحالية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="font-semibold">{task.titleAr}</div>
              <div className="text-xs text-muted-foreground">
                {task.key} | {task.type} | +{task.reward}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>إضافة / تعديل مهمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="معرّف المهمة task_key" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
          <Input placeholder="العنوان بالعربية" value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} />
          <Input placeholder="العنوان بالإنجليزية" value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} />
          <select
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="DAILY">يومية DAILY</option>
            <option value="SOCIAL">اجتماعية SOCIAL</option>
            <option value="CIPHER">شفرة CIPHER</option>
            <option value="SPECIAL">خاصة SPECIAL</option>
          </select>
          <Input placeholder="المكافأة" value={form.reward} onChange={(e) => setForm((p) => ({ ...p, reward: e.target.value }))} />
          <Input placeholder="الرابط (اختياري)" value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDaily} onChange={(e) => setForm((p) => ({ ...p, isDaily: e.target.checked }))} />
            مهمة يومية
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            مفعلة
          </label>
          <Button className="w-full" onClick={() => void submit()}>
            حفظ المهمة
          </Button>
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
