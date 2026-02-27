"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type AdminUser = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  points: string;
  pph: number;
  referralCode: string;
  createdAt: string;
};

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (targetPage: number, targetQuery: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.users(targetPage, targetQuery);
      setUsers(response.users);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المستخدمين.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page, query);
  }, [page]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المستخدم أو كود الإحالة..." />
          <Button onClick={() => void load(1, query)}>بحث</Button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">الاسم</th>
                <th className="p-2">المعرف</th>
                <th className="p-2">النقاط</th>
                <th className="p-2">PPH</th>
                <th className="p-2">الإحالة</th>
                <th className="p-2">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="p-2">{`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"}</td>
                  <td className="p-2">{user.username ?? "-"}</td>
                  <td className="p-2 font-semibold">{formatNumber(user.points)}</td>
                  <td className="p-2">{formatNumber(user.pph)}</td>
                  <td className="p-2">{user.referralCode}</td>
                  <td className="p-2">{new Date(user.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {loading ? "جاري التحميل..." : `عرض ${users.length} من ${total}`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((prev) => prev - 1)}>
              السابق
            </Button>
            <Button variant="outline" size="sm" disabled={loading || users.length === 0} onClick={() => setPage((prev) => prev + 1)}>
              التالي
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
