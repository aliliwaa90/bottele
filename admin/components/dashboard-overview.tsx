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
        name: user.name.slice(0, 10),
        points: Number(user.points)
      })),
    [data]
  );

  if (error) {
    return <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="rounded-lg border border-border bg-card p-4">جاري تحميل لوحة التحكم...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="إجمالي المستخدمين" value={formatNumber(data.totalUsers)} />
        <MetricCard label="النشطون اليوم" value={formatNumber(data.activeToday)} />
        <MetricCard label="إجمالي النقاط" value={formatNumber(data.totalPoints)} />
        <MetricCard label="لقطات الإيردروب" value={formatNumber(data.snapshotsCount)} />
        <MetricCard label="الأحداث النشطة" value={formatNumber(data.activeEvents)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>أفضل المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
