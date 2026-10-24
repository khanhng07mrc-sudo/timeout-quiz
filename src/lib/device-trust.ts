import crypto from "crypto";

export interface TrustedDeviceEntry {
  token: string;
  expiresAt: string;
  userAgent?: string;
  addedAt: string;
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function isDeviceTrusted(
  trustedDevicesJson: string | null | undefined,
  token: string | undefined | null
): boolean {
  if (!trustedDevicesJson || !token) return false;

  try {
    const list: TrustedDeviceEntry[] = JSON.parse(trustedDevicesJson);
    if (!Array.isArray(list)) return false;

    const now = new Date().getTime();
    return list.some(
      (d) => d.token === token && new Date(d.expiresAt).getTime() > now
    );
  } catch {
    return false;
  }
}

export function addTrustedDevice(
  trustedDevicesJson: string | null | undefined,
  token: string,
  userAgent?: string,
  days = 30
): string {
  let list: TrustedDeviceEntry[] = [];
  try {
    if (trustedDevicesJson) {
      const parsed = JSON.parse(trustedDevicesJson);
      if (Array.isArray(parsed)) {
        const now = new Date().getTime();
        // filter out expired entries
        list = parsed.filter((d) => new Date(d.expiresAt).getTime() > now);
      }
    }
  } catch {
    list = [];
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  list.push({
    token,
    expiresAt: expires.toISOString(),
    userAgent: userAgent ? userAgent.substring(0, 150) : undefined,
    addedAt: new Date().toISOString(),
  });

  return JSON.stringify(list);
}
