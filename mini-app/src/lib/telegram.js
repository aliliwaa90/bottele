import WebApp from "@twa-dev/sdk";
export function initTelegram() {
    try {
        WebApp.ready();
        WebApp.expand();
        return WebApp;
    }
    catch {
        return null;
    }
}
export function isTelegramWebApp() {
    try {
        return Boolean(WebApp.initDataUnsafe?.user || WebApp.initData);
    }
    catch {
        return false;
    }
}
export function getTelegramInitData() {
    try {
        return WebApp.initData || null;
    }
    catch {
        return null;
    }
}
export function getTelegramUser() {
    try {
        const user = WebApp.initDataUnsafe?.user;
        if (!user)
            return null;
        return {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            language_code: user.language_code
        };
    }
    catch {
        return null;
    }
}
