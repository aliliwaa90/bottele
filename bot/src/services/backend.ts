import { env } from "../config/env.js";

export type TelegramUserPayload = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

const tokenStore = new Map<number, string>();
const BACKEND_REQUEST_TIMEOUT_MS = 7000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (env.BOT_API_KEY) {
    headers.set("x-bot-api-key", env.BOT_API_KEY);
  }
  headers.set("x-bot-token", env.TELEGRAM_BOT_TOKEN);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.BACKEND_URL}/api${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("backend timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "request failed" }));
    throw new Error(data.message || "request failed");
  }
  return response.json() as Promise<T>;
}

export async function loginWithTelegram(user: TelegramUserPayload, referralCode?: string): Promise<string> {
  const data = await request<{ token: string }>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({
      telegramId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      language: user.language_code ?? env.DEFAULT_LANGUAGE,
      referralCode
    })
  });

  tokenStore.set(user.id, data.token);
  return data.token;
}

async function ensureToken(user: TelegramUserPayload): Promise<string> {
  const existing = tokenStore.get(user.id);
  if (existing) return existing;
  return loginWithTelegram(user);
}

function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

export async function getProfile(user: TelegramUserPayload) {
  const token = await ensureToken(user);
  return request<{
    user: {
      points: string;
      energy: number;
      maxEnergy: number;
      comboMultiplier: number;
      pph: number;
      referralCode: string;
      tapPower: number;
      totalTaps: string;
    };
  }>("/game/me", {
    headers: authHeader(token)
  });
}

export async function getLeaderboard(type: "global" | "weekly" | "friends", user: TelegramUserPayload) {
  const token = await ensureToken(user);
  return request<Array<{ rank: number; name: string; points: string }>>(`/game/leaderboard?type=${type}&limit=10`, {
    headers: authHeader(token)
  });
}

export async function getTasks(user: TelegramUserPayload) {
  const token = await ensureToken(user);
  return request<{
    tasks: Array<{
      id: string;
      key: string;
      titleAr: string;
      titleEn: string;
      reward: number;
      isClaimed: boolean;
      type: "DAILY" | "SOCIAL" | "CIPHER" | "SPECIAL";
    }>;
  }>("/tasks", {
    headers: authHeader(token)
  });
}

export async function claimTask(user: TelegramUserPayload, taskId: string, cipher?: string) {
  const token = await ensureToken(user);
  return request<{ message: string; reward: number }>(`/tasks/${taskId}/claim`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ cipher })
  });
}

export async function getReferrals(user: TelegramUserPayload) {
  const token = await ensureToken(user);
  return request<{
    level1Count: number;
    level2Count: number;
    estimatedRewards: number;
    referrals: Array<{ id: string; name: string; points: string }>;
  }>("/game/referrals", {
    headers: authHeader(token)
  });
}
