"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

type EventItem = {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function EventsManager() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    key: "",
    nameAr: "",
    nameEn: "",
    multiplier: "1.5",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true
  });

  const load = async () => {
    const data = await adminApi.events();
    setEvents(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveEvent = async () => {
    setStatus("جاري حفظ الحدث...");
    try {
      await adminApi.upsertEvent({
        key: form.key,
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        multiplier: Number(form.multiplier),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        isActive: form.isActive
      });
      setStatus("تم حفظ الحدث بنجاح.");
      setForm((prev) => ({
        ...prev,
        key: "",
        nameAr: "",
        nameEn: "",
        multiplier: "1.5"
      }));
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل حفظ الحدث.");
    }
  };

  const toggleEvent = async (eventId: string, active: boolean) => {
    setStatus("جاري تحديث الحدث...");
    try {
      await adminApi.toggleEvent(eventId, active);
      setStatus(active ? "تم تفعيل الحدث." : "تم تعطيل الحدث.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل تحديث الحدث.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>الأحداث الخاصة (Boosters)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{event.nameAr}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.key} | x{event.multiplier}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={event.isActive ? "outline" : "default"}
                  onClick={() => void toggleEvent(event.id, !event.isActive)}
                >
                  {event.isActive ? "تعطيل" : "تفعيل"}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                من {new Date(event.startsAt).toLocaleString()} إلى {new Date(event.endsAt).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>إضافة / تعديل حدث</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="event_key" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
          <Input placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} />
          <Input placeholder="الاسم بالإنجليزية" value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} />
          <Input
            placeholder="المضاعف"
            value={form.multiplier}
            onChange={(e) => setForm((p) => ({ ...p, multiplier: e.target.value }))}
          />
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} />
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            مفعّل
          </label>
          <Button className="w-full" onClick={() => void saveEvent()}>
            حفظ الحدث
          </Button>
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
