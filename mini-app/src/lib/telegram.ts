import WebApp from "@twa-dev/sdk";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

export function initTelegram() {
  try {
    WebApp.ready();
    WebApp.expand();
    return WebApp;
  } catch {
    return null;
  }
}

export function isTelegramWebApp(): boolean {
  try {
    return Boolean(WebApp.initDataUnsafe?.user || WebApp.initData);
  } catch {
    return false;
  }
}

export function getTelegramInitData(): string | null {
  try {
    return WebApp.initData || null;
  } catch {
    return null;
  }
}

export function getTelegramUser(): TelegramUser | null {
  try {
    const user = WebApp.initDataUnsafe?.user;
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      language_code: user.language_code
    };
  } catch {
    return null;
  }
}
