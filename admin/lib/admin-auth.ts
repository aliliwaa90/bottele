export const ADMIN_AUTH_COOKIE = "vaulttap_admin_session";

const DEFAULT_USERNAME = "alifakarr";
const DEFAULT_PASSWORD = "Aliliwaa00";
const DEFAULT_SESSION_VALUE = "vaulttap_admin_session_token_v1";

export function getAdminUsername(): string {
  return process.env.ADMIN_PANEL_USERNAME ?? DEFAULT_USERNAME;
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PANEL_PASSWORD ?? DEFAULT_PASSWORD;
}

export function getAdminSessionValue(): string {
  return process.env.ADMIN_SESSION_VALUE ?? DEFAULT_SESSION_VALUE;
}

export function isValidAdminCredentials(username: string, password: string): boolean {
  return username === getAdminUsername() && password === getAdminPassword();
}

export function isValidAdminSession(session?: string | null): boolean {
  if (!session) return false;
  return session === getAdminSessionValue();
}
