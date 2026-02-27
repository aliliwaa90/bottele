import crypto from "node:crypto";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

export type VerifiedTelegramInitData = {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
};

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number
): VerifiedTelegramInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) return null;

  params.delete("hash");
  const checkString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");

  const received = Buffer.from(receivedHash, "hex");
  const computed = Buffer.from(computedHash, "hex");
  if (received.length !== computed.length) return null;
  if (!crypto.timingSafeEqual(received, computed)) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authDate) > maxAgeSeconds) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;
  let user: TelegramUser;
  try {
    user = JSON.parse(rawUser) as TelegramUser;
  } catch {
    return null;
  }
  if (!user.id) return null;

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined
  };
}
