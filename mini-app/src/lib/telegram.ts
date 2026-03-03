/**
 * VaultTap — Telegram WebApp Bridge
 * ─────────────────────────────────────────────────────────────────
 * Production-grade Telegram Mini App integration layer.
 *
 * Features:
 *  • Full type-safe WebApp SDK wrapper
 *  • Safe initialization with retry logic
 *  • Viewport / theme / haptic utilities
 *  • Invoice handling with timeout guard
 *  • Deep-link & start-param parsing
 *  • Back-button lifecycle management
 *  • Main-button builder
 *  • Cloud storage (Telegram's key-value store)
 *  • Popup / alert / confirmation helpers
 *  • Dev-mode fallback (works outside Telegram)
 * ─────────────────────────────────────────────────────────────────
 */

import WebApp from "@twa-dev/sdk";

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */

export interface TelegramUser {
  id:             number;
  username?:      string;
  firstName?:     string;
  lastName?:      string;
  languageCode?:  string;
  isPremium?:     boolean;
  photoUrl?:      string;
  allowsWriteToPm?: boolean;
}

export interface TelegramChat {
  id:       number;
  type:     "group" | "supergroup" | "channel";
  title?:   string;
  username?: string;
  photoUrl?: string;
}

export interface TelegramTheme {
  bgColor:            string;
  textColor:          string;
  hintColor:          string;
  linkColor:          string;
  buttonColor:        string;
  buttonTextColor:    string;
  secondaryBgColor?:  string;
  headerBgColor?:     string;
  accentTextColor?:   string;
  sectionBgColor?:    string;
  destructiveTextColor?: string;
}

export interface TelegramViewport {
  width:         number;
  height:        number;
  stableHeight:  number;
  isExpanded:    boolean;
}

export type InvoiceStatus =
  | "paid"
  | "cancelled"
  | "failed"
  | "pending"
  | "unsupported"
  | "timeout";

export type HapticStyle         = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotification  = "error" | "success" | "warning";

export type PopupButtonType     = "default" | "ok" | "close" | "cancel" | "destructive";

export interface PopupButton {
  id?:   string;
  type?: PopupButtonType;
  text?: string;
}

export interface MainButtonConfig {
  text?:        string;
  color?:       string;
  textColor?:   string;
  isVisible?:   boolean;
  isActive?:    boolean;
  isLoading?:   boolean;
}

/* ═══════════════════════════════════════════════
   INTERNAL HELPERS
═══════════════════════════════════════════════ */

/** Run a function safely and return null on any error */
function safe<T>(fn: () => T): T | null {
  try { return fn(); }
  catch { return null; }
}

/** Check if we are truly running inside a Telegram WebApp */
function inTelegram(): boolean {
  return safe(() =>
    Boolean(
      WebApp.initDataUnsafe?.user ||
      (typeof WebApp.initData === "string" && WebApp.initData.length > 0),
    ),
  ) ?? false;
}

/* ═══════════════════════════════════════════════
   1. INITIALIZATION
═══════════════════════════════════════════════ */

/**
 * Initialize and expand the Telegram WebApp.
 * Call once at app startup — idempotent.
 *
 * @param options.disableClosingConfirmation  Skip the "are you sure?" prompt on close
 * @param options.enableVerticalSwipes        Allow swipe-down-to-close gesture (default: off)
 */
export function initTelegram(options?: {
  disableClosingConfirmation?: boolean;
  enableVerticalSwipes?:       boolean;
}): typeof WebApp | null {
  return safe(() => {
    WebApp.ready();
    WebApp.expand();

    if (options?.disableClosingConfirmation) {
      WebApp.disableClosingConfirmation();
    }

    // Vertical swipe (Telegram ≥ 7.7)
    const sdk = WebApp as unknown as Record<string, unknown>;
    if (options?.enableVerticalSwipes) {
      if (typeof sdk["enableVerticalSwipes"] === "function")
        (sdk["enableVerticalSwipes"] as () => void)();
    } else {
      if (typeof sdk["disableVerticalSwipes"] === "function")
        (sdk["disableVerticalSwipes"] as () => void)();
    }

    return WebApp;
  });
}

/**
 * Returns true only when running inside a real Telegram WebApp context.
 * Returns false in a normal browser or during SSR.
 */
export function isTelegramWebApp(): boolean {
  return inTelegram();
}

/* ═══════════════════════════════════════════════
   2. USER & CHAT
═══════════════════════════════════════════════ */

/**
 * Returns the current Telegram user, or null outside Telegram.
 */
export function getTelegramUser(): TelegramUser | null {
  return safe(() => {
    const u = WebApp.initDataUnsafe?.user;
    if (!u) return null;
    const extra = u as unknown as {
      is_premium?: boolean;
      photo_url?: string;
      allows_write_to_pm?: boolean;
    };
    return {
      id:              u.id,
      username:        u.username        ?? undefined,
      firstName:       u.first_name      ?? undefined,
      lastName:        u.last_name       ?? undefined,
      languageCode:    u.language_code   ?? undefined,
      isPremium:       extra.is_premium,
      photoUrl:        extra.photo_url,
      allowsWriteToPm: extra.allows_write_to_pm,
    };
  });
}

/**
 * Returns the chat the Mini App was launched from, if any.
 */
export function getTelegramChat(): TelegramChat | null {
  return safe(() => {
    const raw = WebApp.initDataUnsafe as unknown as {
      chat?: {
        id: number;
        type: "group" | "supergroup" | "channel";
        title?: string;
        username?: string;
        photo_url?: string;
      };
    };
    const c = raw?.chat;
    if (!c) return null;
    return {
      id:       c.id,
      type:     c.type,
      title:    c.title,
      username: c.username,
      photoUrl: c.photo_url,
    };
  });
}

/**
 * Returns the raw initData string for server-side validation.
 */
export function getTelegramInitData(): string | null {
  return safe(() => WebApp.initData || null);
}

/* ═══════════════════════════════════════════════
   3. START PARAMS & DEEP LINKS
═══════════════════════════════════════════════ */

/**
 * Returns the `?start=` or `?startapp=` parameter passed to the bot link.
 * Handles both `start_param` (grammY) and URL search params as fallback.
 */
export function getTelegramStartParam(): string | null {
  // 1. Native SDK (most reliable)
  const native = safe(() => {
    const sp = WebApp.initDataUnsafe?.start_param;
    if (typeof sp === "string" && sp.trim().length > 0) return sp.trim();
    return null;
  });
  if (native) return native;

  // 2. URL search param fallback (dev mode / testing)
  return safe(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("startapp") ?? params.get("start") ?? params.get("ref");
    if (fromUrl && fromUrl.trim().length > 0) return fromUrl.trim();
    return null;
  });
}

/**
 * Parse a structured referral / invite code embedded in the start_param.
 * Expects format: `ref_<code>` or just `<code>`.
 */
export function parseReferralCode(): string | null {
  const param = getTelegramStartParam();
  if (!param) return null;
  // Strip common prefixes
  if (param.startsWith("ref_")) return param.slice(4);
  if (param.startsWith("r_"))   return param.slice(2);
  return param;
}

/* ═══════════════════════════════════════════════
   4. THEME & VIEWPORT
═══════════════════════════════════════════════ */

/**
 * Returns current Telegram color theme parameters.
 */
export function getTelegramTheme(): TelegramTheme | null {
  return safe(() => {
    const tp = WebApp.themeParams as unknown as Record<string, string | undefined>;
    return {
      bgColor:               tp["bg_color"]              ?? "#000000",
      textColor:             tp["text_color"]            ?? "#ffffff",
      hintColor:             tp["hint_color"]            ?? "#888888",
      linkColor:             tp["link_color"]            ?? "#2481cc",
      buttonColor:           tp["button_color"]          ?? "#2481cc",
      buttonTextColor:       tp["button_text_color"]     ?? "#ffffff",
      secondaryBgColor:      tp["secondary_bg_color"],
      headerBgColor:         tp["header_bg_color"],
      accentTextColor:       tp["accent_text_color"],
      sectionBgColor:        tp["section_bg_color"],
      destructiveTextColor:  tp["destructive_text_color"],
    };
  });
}

/**
 * Returns viewport dimensions including the stable (non-keyboard) height.
 */
export function getTelegramViewport(): TelegramViewport {
  return safe(() => ({
    width:        (WebApp as unknown as { viewportWidth?: number }).viewportWidth ?? window.innerWidth,
    height:       WebApp.viewportHeight,
    stableHeight: WebApp.viewportStableHeight,
    isExpanded:   WebApp.isExpanded,
  })) ?? {
    width:        window.innerWidth,
    height:       window.innerHeight,
    stableHeight: window.innerHeight,
    isExpanded:   false,
  };
}

/**
 * Force the Mini App to expand to full-screen height.
 */
export function expandTelegram(): void {
  safe(() => WebApp.expand());
}

/* ═══════════════════════════════════════════════
   5. HAPTIC FEEDBACK
═══════════════════════════════════════════════ */

/**
 * Trigger an impact haptic (finger tap).
 */
export function hapticImpact(style: HapticStyle = "medium"): void {
  safe(() => WebApp.HapticFeedback.impactOccurred(style));
}

/**
 * Trigger a notification haptic (success / error / warning).
 */
export function hapticNotification(type: HapticNotification = "success"): void {
  safe(() => WebApp.HapticFeedback.notificationOccurred(type));
}

/**
 * Trigger a selection-change haptic (e.g. list scroll).
 */
export function hapticSelection(): void {
  safe(() => WebApp.HapticFeedback.selectionChanged());
}

/* ═══════════════════════════════════════════════
   6. INVOICE / PAYMENTS
═══════════════════════════════════════════════ */

/**
 * Open a Telegram Stars invoice and await the result.
 *
 * Returns:
 *  - "paid"        → payment successful
 *  - "cancelled"   → user dismissed
 *  - "failed"      → payment error
 *  - "pending"     → still processing (rare)
 *  - "timeout"     → no callback within `timeoutMs`
 *  - "unsupported" → openInvoice not available (old client)
 */
export function openTelegramInvoice(
  invoiceUrl: string,
  timeoutMs  = 90_000,
): Promise<InvoiceStatus> {
  return new Promise<InvoiceStatus>((resolve) => {
    // Guard: openInvoice not available
    const sdk = WebApp as unknown as {
      openInvoice?: (
        url:      string,
        callback: (status: "paid" | "cancelled" | "failed" | "pending") => void,
      ) => void;
    };

    if (typeof sdk.openInvoice !== "function") {
      resolve("unsupported");
      return;
    }

    let settled = false;
    const settle = (status: InvoiceStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(status);
    };

    // Safety timeout
    const timer = window.setTimeout(() => settle("timeout"), timeoutMs);

    try {
      sdk.openInvoice(invoiceUrl, (status) => settle(status));
    } catch {
      settle("unsupported");
    }
  });
}

/* ═══════════════════════════════════════════════
   7. POPUPS & ALERTS
═══════════════════════════════════════════════ */

/**
 * Show a native Telegram popup with custom buttons.
 * Returns the `id` of the button that was pressed, or null if closed.
 *
 * Falls back to `window.confirm` / `window.alert` outside Telegram.
 */
export function showTelegramPopup(options: {
  title?:   string;
  message:  string;
  buttons?: PopupButton[];
}): Promise<string | null> {
  return new Promise((resolve) => {
    const sdk = WebApp as unknown as {
      showPopup?: (
        params: { title?: string; message: string; buttons?: PopupButton[] },
        callback?: (buttonId: string) => void,
      ) => void;
    };

    if (typeof sdk.showPopup === "function") {
      try {
        sdk.showPopup(
          {
            title:   options.title,
            message: options.message,
            buttons: options.buttons ?? [{ type: "close" }],
          },
          (id) => resolve(id ?? null),
        );
        return;
      } catch { /* fall through */ }
    }

    // Fallback
    if (options.buttons?.some(b => b.type === "cancel" || b.type === "close")) {
      const ok = window.confirm(`${options.title ? options.title + "\n" : ""}${options.message}`);
      resolve(ok ? "ok" : "cancel");
    } else {
      window.alert(`${options.title ? options.title + "\n" : ""}${options.message}`);
      resolve("ok");
    }
  });
}

/**
 * Simple confirm dialog: resolves true / false.
 */
export async function confirmDialog(message: string, title?: string): Promise<boolean> {
  const result = await showTelegramPopup({
    title,
    message,
    buttons: [
      { id: "yes", type: "default",     text: "Yes" },
      { id: "no",  type: "destructive", text: "No"  },
    ],
  });
  return result === "yes";
}

/* ═══════════════════════════════════════════════
   8. MAIN BUTTON
═══════════════════════════════════════════════ */

/**
 * Configure and show the Telegram Main Button.
 * Returns a cleanup function to hide + remove the click handler.
 */
export function showMainButton(
  config:  MainButtonConfig,
  onClick: () => void,
): () => void {
  safe(() => {
    const mb = WebApp.MainButton;
    if (config.text)      mb.setText(config.text);
    if (config.color)     mb.color = config.color as `#${string}`;
    if (config.textColor) mb.textColor = config.textColor as `#${string}`;
    if (config.isLoading) mb.showProgress(true);
    mb.onClick(onClick);
    if (config.isVisible !== false) mb.show();
    else mb.hide();
  });

  // Cleanup
  return () => {
    safe(() => {
      WebApp.MainButton.offClick(onClick);
      WebApp.MainButton.hideProgress();
      WebApp.MainButton.hide();
    });
  };
}

/**
 * Update the Main Button state (loading / disabled / text) without re-registering.
 */
export function updateMainButton(config: MainButtonConfig): void {
  safe(() => {
    const mb = WebApp.MainButton;
    if (config.text !== undefined) mb.setText(config.text);
    if (config.isLoading !== undefined) {
      if (config.isLoading) mb.showProgress(true);
      else mb.hideProgress();
    }
    if (config.isActive !== undefined) {
      if (config.isActive) mb.enable();
      else mb.disable();
    }
  });
}

/**
 * Hide and reset the Main Button.
 */
export function hideMainButton(): void {
  safe(() => {
    WebApp.MainButton.hideProgress();
    WebApp.MainButton.hide();
  });
}

/* ═══════════════════════════════════════════════
   9. BACK BUTTON
═══════════════════════════════════════════════ */

/**
 * Show the Telegram Back button and register a handler.
 * Returns a cleanup function.
 */
export function showBackButton(onBack: () => void): () => void {
  safe(() => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onBack);
  });

  return () => {
    safe(() => {
      WebApp.BackButton.offClick(onBack);
      WebApp.BackButton.hide();
    });
  };
}

/**
 * Hide the Back button.
 */
export function hideBackButton(): void {
  safe(() => WebApp.BackButton.hide());
}

/* ═══════════════════════════════════════════════
   10. CLOUD STORAGE
═══════════════════════════════════════════════ */

/**
 * Store a value in Telegram's cloud storage (persists across devices).
 * Key: 1-128 chars [A-Za-z0-9_-]
 * Value: max 4096 chars
 */
export function cloudSet(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = WebApp as unknown as {
      CloudStorage?: {
        setItem: (key: string, value: string, cb?: (err: Error | null, ok: boolean) => void) => void;
      };
    };
    if (!sdk.CloudStorage) { resolve(false); return; }
    try {
      sdk.CloudStorage.setItem(key, value, (err, ok) => resolve(!err && ok));
    } catch { resolve(false); }
  });
}

/**
 * Retrieve a value from Telegram's cloud storage.
 */
export function cloudGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const sdk = WebApp as unknown as {
      CloudStorage?: {
        getItem: (key: string, cb?: (err: Error | null, value: string) => void) => void;
      };
    };
    if (!sdk.CloudStorage) { resolve(null); return; }
    try {
      sdk.CloudStorage.getItem(key, (err, value) => resolve(err ? null : (value ?? null)));
    } catch { resolve(null); }
  });
}

/**
 * Remove a key from Telegram's cloud storage.
 */
export function cloudRemove(key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sdk = WebApp as unknown as {
      CloudStorage?: {
        removeItem: (key: string, cb?: (err: Error | null, ok: boolean) => void) => void;
      };
    };
    if (!sdk.CloudStorage) { resolve(false); return; }
    try {
      sdk.CloudStorage.removeItem(key, (err, ok) => resolve(!err && ok));
    } catch { resolve(false); }
  });
}

/* ═══════════════════════════════════════════════
   11. EXTERNAL LINKS
═══════════════════════════════════════════════ */

/**
 * Open a Telegram link (t.me/…) using the built-in SDK.
 * Falls back to window.open for regular URLs.
 */
export function openTelegramLink(url: string): void {
  safe(() => {
    if (url.startsWith("https://t.me/") || url.startsWith("tg://")) {
      WebApp.openTelegramLink(url);
    } else {
      WebApp.openLink(url, { try_instant_view: false });
    }
  }) ?? window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Open an external URL in the in-app browser.
 * @param tryInstantView  Use Telegram Instant View if available (default: false)
 */
export function openExternalLink(url: string, tryInstantView = false): void {
  safe(() => WebApp.openLink(url, { try_instant_view: tryInstantView }))
    ?? window.open(url, "_blank", "noopener,noreferrer");
}

/* ═══════════════════════════════════════════════
   12. CLOSE APP
═══════════════════════════════════════════════ */

/**
 * Close the Mini App programmatically.
 */
export function closeTelegram(): void {
  safe(() => WebApp.close());
}

/**
 * Enable the "Are you sure you want to close?" confirmation dialog.
 */
export function enableCloseConfirmation(): void {
  safe(() => WebApp.enableClosingConfirmation());
}

/**
 * Disable the close confirmation dialog.
 */
export function disableCloseConfirmation(): void {
  safe(() => WebApp.disableClosingConfirmation());
}

/* ═══════════════════════════════════════════════
   13. PLATFORM DETECTION
═══════════════════════════════════════════════ */

export type TelegramPlatform =
  | "android"
  | "android_x"
  | "ios"
  | "macos"
  | "tdesktop"
  | "web"
  | "weba"
  | "webk"
  | "unknown";

/**
 * Returns the current Telegram platform identifier.
 */
export function getTelegramPlatform(): TelegramPlatform {
  return safe(() => WebApp.platform as TelegramPlatform) ?? "unknown";
}

/**
 * Returns true if running on iOS Telegram client.
 */
export function isIOS(): boolean {
  const p = getTelegramPlatform();
  return p === "ios";
}

/**
 * Returns true if running on Android Telegram client.
 */
export function isAndroid(): boolean {
  const p = getTelegramPlatform();
  return p === "android" || p === "android_x";
}

/**
 * Returns the Telegram WebApp version string (e.g. "7.10").
 */
export function getTelegramVersion(): string {
  return safe(() => WebApp.version) ?? "0.0";
}

/**
 * Returns true if the current client supports a given WebApp version.
 */
export function isVersionAtLeast(version: string): boolean {
  return safe(() => WebApp.isVersionAtLeast(version)) ?? false;
}

/* ═══════════════════════════════════════════════
   14. CONVENIENCE BUNDLE
═══════════════════════════════════════════════ */

/**
 * One-call setup for app startup.
 * Returns everything the app needs from Telegram.
 */
export function bootstrapTelegram(options?: {
  disableClosingConfirmation?: boolean;
  enableVerticalSwipes?:       boolean;
}): {
  sdk:         typeof WebApp | null;
  user:        TelegramUser | null;
  initData:    string | null;
  startParam:  string | null;
  referral:    string | null;
  theme:       TelegramTheme | null;
  viewport:    TelegramViewport;
  platform:    TelegramPlatform;
  version:     string;
  isInTelegram: boolean;
} {
  const sdk        = initTelegram(options);
  const isInTg     = isTelegramWebApp();

  return {
    sdk,
    user:        getTelegramUser(),
    initData:    getTelegramInitData(),
    startParam:  getTelegramStartParam(),
    referral:    parseReferralCode(),
    theme:       getTelegramTheme(),
    viewport:    getTelegramViewport(),
    platform:    getTelegramPlatform(),
    version:     getTelegramVersion(),
    isInTelegram: isInTg,
  };
}
