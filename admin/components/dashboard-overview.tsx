"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { io } from "socket.io-client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type DashboardState = {
  totalUsers: number;
  activeToday: number;
  totalPoints: string;
  snapshotsCount: number;
  activeEvents: number;
  topUsers: Array<{ id: string; name: string; points: string; pph: number }>;
};

const metricCards = [
  { key: "totalUsers", label: "إجمالي المستخدمين", accent: "from-sky-500 to-cyan-500" },
  { key: "activeToday", label: "نشطون اليوم", accent: "from-emerald-500 to-teal-500" },
  { key: "totalPoints", label: "إجمالي النقاط", accent: "from-indigo-500 to-blue-500" },
  { key: "snapshotsCount", label: "لقطات الإيردروب", accent: "from-amber-500 to-orange-500" },
  { key: "activeEvents", label: "الأحداث النشطة", accent: "from-fuchsia-500 to-pink-500" }
] as const;

export function DashboardOverview() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    adminApi
      .dashboard()
      .then((response) => {
        if (mounted) setData(response);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "فشل تحميل الإحصائيات."));

    const socketDisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKET === "true";
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    const socket = socketDisabled
      ? null
      : io(socketUrl, {
          transports: ["websocket"],
          autoConnect: true
        });
    socket?.on("leaderboard:update", () => {
      void adminApi.dashboard().then((response) => mounted && setData(response));
    });
    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, []);

  const chartData = useMemo(
    () =>
      (data?.topUsers ?? []).map((user) => ({
        name: user.name.slice(0, 14),
        points: Number(user.points)
      })),
    [data]
  );

  if (error) {
    return <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="rounded-xl border border-border bg-card p-4">جارٍ تحميل لوحة التحكم...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={formatNumber(data[metric.key])}
            accent={metric.accent}
          />
        ))}
      </section>

      <Card className="overflow-hidden border-sky-100/70 shadow-xl shadow-sky-100/30">
        <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 to-white">
          <CardTitle className="text-xl">أفضل اللاعبين حسب النقاط</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#0284c7" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card className="overflow-hidden border-sky-100/70">
      <CardContent className="relative p-4">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
