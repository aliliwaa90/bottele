const API_URL = "/api/proxy";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message || "Request failed.");
  }
  return response.json() as Promise<T>;
}

export const adminApi = {
  dashboard: () =>
    request<{
      totalUsers: number;
      activeToday: number;
      totalPoints: string;
      snapshotsCount: number;
      activeEvents: number;
      topUsers: Array<{ id: string; name: string; points: string; pph: number }>;
    }>("/admin/dashboard"),
  users: (page = 1, q = "") =>
    request<{
      total: number;
      users: Array<{
        id: string;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        points: string;
        pph: number;
        referralCode: string;
        createdAt: string;
      }>;
    }>(`/admin/users?page=${page}&limit=30&q=${encodeURIComponent(q)}`),
  tasks: () => request<Array<{ id: string; key: string; titleAr: string; titleEn: string; reward: number; type: string }>>("/admin/tasks"),
  upsertTask: (payload: unknown) =>
    request<{ message: string }>("/admin/tasks/upsert", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  events: () =>
    request<
      Array<{
        id: string;
        key: string;
        nameAr: string;
        nameEn: string;
        multiplier: number;
        startsAt: string;
        endsAt: string;
        isActive: boolean;
      }>
    >("/admin/events"),
  upsertEvent: (payload: unknown) =>
    request<{ message: string }>("/admin/events/upsert", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  toggleEvent: (eventId: string, isActive: boolean) =>
    request<{ message: string }>(`/admin/events/${eventId}/toggle`, {
      method: "POST",
      body: JSON.stringify({ isActive })
    }),
  notify: (payload: { title: string; body: string; target: "all" | "active" }) =>
    request<{ message: string }>("/admin/notify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createSnapshot: (batchTag: string) =>
    request<{ count: number; message: string }>("/admin/airdrop/snapshot", {
      method: "POST",
      body: JSON.stringify({ batchTag })
    })
};
