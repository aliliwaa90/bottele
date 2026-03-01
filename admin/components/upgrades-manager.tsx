"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type UpgradeItem = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  imageUrl?: string | null;
  category: string;
  baseCost: number;
  maxLevel: number;
  difficulty: number;
  unlockLevel: number;
  starsPrice?: number | null;
  pphBoost: number;
  tapBoost: number;
  energyBoost: number;
  autoTapBoost: number;
};

const emptyForm = {
  key: "",
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  icon: "⚙️",
  imageUrl: "",
  category: "core",
  baseCost: "100",
  maxLevel: "105",
  difficulty: "1.08",
  unlockLevel: "1",
  starsPrice: "",
  pphBoost: "0",
  tapBoost: "0",
  energyBoost: "0",
  autoTapBoost: "0"
};

export function UpgradesManager() {
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await adminApi.upgrades();
    setUpgrades(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const sortedUpgrades = useMemo(
    () => [...upgrades].sort((a, b) => a.baseCost - b.baseCost),
    [upgrades]
  );

  const applyDraft = (item: UpgradeItem) => {
    setForm({
      key: item.key,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      descriptionAr: item.descriptionAr,
      descriptionEn: item.descriptionEn,
      icon: item.icon,
      imageUrl: item.imageUrl ?? "",
      category: item.category,
      baseCost: String(item.baseCost),
      maxLevel: String(item.maxLevel),
      difficulty: String(item.difficulty),
      unlockLevel: String(item.unlockLevel),
      starsPrice: item.starsPrice ? String(item.starsPrice) : "",
      pphBoost: String(item.pphBoost),
      tapBoost: String(item.tapBoost),
      energyBoost: String(item.energyBoost),
      autoTapBoost: String(item.autoTapBoost)
    });
    setStatus("تم تحميل بيانات الترقية في النموذج.");
  };

  const submit = async () => {
    setLoading(true);
    setStatus("جارٍ حفظ الترقية...");
    try {
      await adminApi.upsertUpgrade({
        key: form.key.trim(),
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim(),
        descriptionAr: form.descriptionAr.trim(),
        descriptionEn: form.descriptionEn.trim(),
        icon: form.icon.trim() || "⚙️",
        imageUrl: form.imageUrl.trim() || undefined,
        category: form.category.trim() || "core",
        baseCost: Number(form.baseCost),
        maxLevel: Number(form.maxLevel),
        difficulty: Number(form.difficulty),
        unlockLevel: Number(form.unlockLevel),
        starsPrice: form.starsPrice.trim() ? Number(form.starsPrice) : undefined,
        pphBoost: Number(form.pphBoost),
        tapBoost: Number(form.tapBoost),
        energyBoost: Number(form.energyBoost),
        autoTapBoost: Number(form.autoTapBoost)
      });
      setStatus("تم حفظ الترقية بنجاح.");
      setForm({ ...emptyForm });
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "فشل حفظ الترقية.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>الترقيات الحالية ({sortedUpgrades.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedUpgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className="rounded-xl border border-border/80 bg-card/60 p-3 transition hover:border-sky-300"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{upgrade.icon}</span>
                    <h4 className="font-bold">{upgrade.titleAr}</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{upgrade.key}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => applyDraft(upgrade)}>
                  تعديل
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <Info label="التكلفة" value={formatNumber(upgrade.baseCost)} />
                <Info label="المستوى الأقصى" value={String(upgrade.maxLevel)} />
                <Info label="الصعوبة" value={String(upgrade.difficulty)} />
                <Info label="النجوم" value={upgrade.starsPrice ? String(upgrade.starsPrice) : "-"} />
                <Info label="Tap+" value={String(upgrade.tapBoost)} />
                <Info label="PPH+" value={String(upgrade.pphBoost)} />
                <Info label="طاقة+" value={String(upgrade.energyBoost)} />
                <Info label="AutoTap+" value={String(upgrade.autoTapBoost)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة / تعديل ترقية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="key (مثال: auto_clicker_v3)"
            value={form.key}
            onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
          />
          <Input
            placeholder="العنوان بالعربية"
            value={form.titleAr}
            onChange={(event) => setForm((prev) => ({ ...prev, titleAr: event.target.value }))}
          />
          <Input
            placeholder="Title in English"
            value={form.titleEn}
            onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
          />
          <textarea
            className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="الوصف بالعربية"
            value={form.descriptionAr}
            onChange={(event) => setForm((prev) => ({ ...prev, descriptionAr: event.target.value }))}
          />
          <textarea
            className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Description in English"
            value={form.descriptionEn}
            onChange={(event) => setForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="الأيقونة (emoji)"
              value={form.icon}
              onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
            />
            <Input
              placeholder="التصنيف"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
          </div>
          <Input
            placeholder="رابط صورة (اختياري)"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Base Cost"
              value={form.baseCost}
              onChange={(event) => setForm((prev) => ({ ...prev, baseCost: event.target.value }))}
            />
            <Input
              placeholder="Max Level"
              value={form.maxLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, maxLevel: event.target.value }))}
            />
            <Input
              placeholder="Difficulty (1.01 - 1.50)"
              value={form.difficulty}
              onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
            />
            <Input
              placeholder="Unlock Level"
              value={form.unlockLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, unlockLevel: event.target.value }))}
            />
            <Input
              placeholder="Stars Price (اختياري)"
              value={form.starsPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, starsPrice: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="PPH Boost"
              value={form.pphBoost}
              onChange={(event) => setForm((prev) => ({ ...prev, pphBoost: event.target.value }))}
            />
            <Input
              placeholder="Tap Boost"
              value={form.tapBoost}
              onChange={(event) => setForm((prev) => ({ ...prev, tapBoost: event.target.value }))}
            />
            <Input
              placeholder="Energy Boost"
              value={form.energyBoost}
              onChange={(event) => setForm((prev) => ({ ...prev, energyBoost: event.target.value }))}
            />
            <Input
              placeholder="AutoTap Boost"
              value={form.autoTapBoost}
              onChange={(event) => setForm((prev) => ({ ...prev, autoTapBoost: event.target.value }))}
            />
          </div>
          <Button className="w-full" disabled={loading} onClick={() => void submit()}>
            {loading ? "جارٍ الحفظ..." : "حفظ الترقية"}
          </Button>
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-2 py-1.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
