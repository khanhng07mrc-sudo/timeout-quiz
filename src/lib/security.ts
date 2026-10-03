import crypto from "crypto";
import bcrypt from "bcryptjs";

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "Quizorra_super_secret_key_2026";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days session

export function getAdminMasterPassword(): string {
  return process.env.ADMIN_MASTER_PASSWORD || "Quizorra@Admin2026";
}

/**
 * Generate a cryptographically secure host secret key for a room
 * Format: hk_<16 hex characters>
 */
export function generateHostKey(): string {
  return `hk_${crypto.randomBytes(8).toString("hex")}`;
}

export interface UserSessionPayload {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  iat: number;
  exp: number;
}

interface LegacyAdminTokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Hash a plain text password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain text password against hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates an HMAC-signed User session token
 */
export function createUserToken(user: { id: string; name: string; email: string; role?: "ADMIN" | "USER" }): string {
  const payload: UserSessionPayload = {
    userId: user.id,
    name: user.name,
    email: user.email.toLowerCase().trim(),
    role: user.role || "USER",
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

/**
 * Creates an HMAC-signed Legacy Admin session token (for Master Passcode bypass)
 */
export function createAdminToken(): string {
  const payload: LegacyAdminTokenPayload = {
    role: "admin",
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verifies a User session token and returns decoded payload
 */
export function verifyUserToken(token: string | null | undefined): UserSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    );
    if (!payload.userId || typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload as UserSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies an Admin session token (accepts both legacy admin token and user session)
 */
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadEncoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    );
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;
    if (payload.role === "admin" || payload.role === "ADMIN" || payload.userId) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts currently logged-in user from Request headers / cookies
 */
export function getCurrentUserFromRequest(req: Request): UserSessionPayload | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = verifyUserToken(token);
    if (user) return user;
  }

  // 2. Check x-admin-token or x-auth-token custom headers
  const customHeader = req.headers.get("x-auth-token") || req.headers.get("x-admin-token");
  if (customHeader) {
    const user = verifyUserToken(customHeader);
    if (user) return user;
  }

  // 3. Check cookies (auth_token or admin_token)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const matchAuth = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (matchAuth && matchAuth[1]) {
      const user = verifyUserToken(decodeURIComponent(matchAuth[1]));
      if (user) return user;
    }
    const matchAdmin = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (matchAdmin && matchAdmin[1]) {
      const user = verifyUserToken(decodeURIComponent(matchAdmin[1]));
      if (user) return user;
    }
  }

  return null;
}

/**
 * Extracts and verifies admin authentication from Request headers / cookies
 */
export function verifyAdminRequest(req: Request): boolean {
  // Check if a registered user session exists
  if (getCurrentUserFromRequest(req)) return true;

  // 1. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (verifyAdminToken(token)) return true;
  }

  // 2. Check custom headers
  const customHeader = req.headers.get("x-admin-token") || req.headers.get("x-auth-token");
  if (customHeader && verifyAdminToken(customHeader)) return true;

  // 3. Check cookies (admin_token / auth_token)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const matchAdmin = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (matchAdmin && matchAdmin[1]) {
      if (verifyAdminToken(decodeURIComponent(matchAdmin[1]))) return true;
    }
    const matchAuth = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (matchAuth && matchAuth[1]) {
      if (verifyAdminToken(decodeURIComponent(matchAuth[1]))) return true;
    }
  }

  return false;
}

/**
 * Validates Host Key for a specific room against provided key / admin credentials
 */
export function verifyHostOrAdmin(
  req: Request,
  roomHostKey: string | null | undefined
): boolean {
  // If request has valid Admin Master Token or Logged in User, allow
  if (verifyAdminRequest(req)) return true;

  // Otherwise check x-host-key header
  const providedKey = req.headers.get("x-host-key");
  if (roomHostKey && providedKey && roomHostKey === providedKey.trim()) {
    return true;
  }

  return false;
}

/**
 * Sanitizes player names
 */
export function sanitizePlayerName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";

  let cleaned = rawName
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 25) {
    cleaned = cleaned.slice(0, 25).trim();
  }

  return cleaned;
}

/**
 * General text input sanitizer
 */
export function sanitizeInput(text: string | null | undefined, maxLength = 500): string {
  if (!text || typeof text !== "string") return "";
  let cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

