import type { LeaderboardItem, Task, Upgrade, User } from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let authToken: string | null = localStorage.getItem("vaulttap-token");

function withAuth(headers: HeadersInit = {}): HeadersInit {
  if (!authToken) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${authToken}`
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...withAuth(options.headers)
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message || "Request failed.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  setToken(token: string) {
    authToken = token;
    localStorage.setItem("vaulttap-token", token);
  },
  getToken(): string | null {
    return authToken;
  },
  clearToken() {
    authToken = null;
    localStorage.removeItem("vaulttap-token");
  },
  login(payload: {
    telegramId?: string | number | bigint;
    username?: string;
    firstName?: string;
    lastName?: string;
    language?: string;
    referralCode?: string;
    initData?: string;
  }) {
    return request<{ token: string; user: User }>("/auth/telegram", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me() {
    return request<{ user: User }>("/auth/me");
  },
  gameMe() {
    return request<{
      user: User;
      upgrades: Upgrade[];
      activeEvents: Array<{ id: string; nameAr: string; nameEn: string; multiplier: number }>;
      referral: { directReferrals: number; referralCode: string };
    }>("/game/me");
  },
  tap(taps: number) {
    return request<{ pointsEarned: number; comboMultiplier: number; user: User }>("/game/tap", {
      method: "POST",
      body: JSON.stringify({ taps })
    });
  },
  buyUpgrade(upgradeId: string) {
    return request<{ message: string; cost: number; user: User }>(`/game/upgrades/${upgradeId}/buy`, {
      method: "POST"
    });
  },
  getTasks() {
    return request<{ dailyCipherHint: string; tasks: Task[] }>("/tasks");
  },
  claimTask(taskId: string, cipher?: string) {
    return request<{ message: string; reward: number }>(`/tasks/${taskId}/claim`, {
      method: "POST",
      body: JSON.stringify({ cipher })
    });
  },
  leaderboard(type: "global" | "weekly" | "friends") {
    return request<LeaderboardItem[]>(`/game/leaderboard?type=${type}&limit=50`);
  },
  referrals() {
    return request<{
      referralCode?: string;
      rewardPerInvite?: number;
      level1Count: number;
      level2Count: number;
      estimatedRewards: number;
      referrals: Array<{ id: string; name: string; points: string }>;
    }>("/game/referrals");
  },
  claimAirdrop(walletAddress: string) {
    return request<{ estimatedJetton: number; walletAddress: string }>("/game/claim-airdrop", {
      method: "POST",
      body: JSON.stringify({ walletAddress })
    });
  },
  createStarsInvoice(upgradeKey: string) {
    return request<{ invoiceLink: string; starsPrice: number; upgradeKey: string }>(
      "/payments/telegram-stars/invoice",
      {
        method: "POST",
        body: JSON.stringify({ upgradeKey })
      }
    );
  }
};
