import crypto from "crypto";

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "timeout_quiz_super_secret_key_2026";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getAdminMasterPassword(): string {
  return process.env.ADMIN_MASTER_PASSWORD || "TimeoutQuiz@Admin2026";
}

/**
 * Generate a cryptographically secure host secret key for a room
 * Format: hk_<16 hex characters>
 */
export function generateHostKey(): string {
  return `hk_${crypto.randomBytes(8).toString("hex")}`;
}

interface AdminTokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Creates an HMAC-signed Admin session token
 */
export function createAdminToken(): string {
  const payload: AdminTokenPayload = {
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
 * Verifies an Admin session token
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

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload: AdminTokenPayload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    );
    if (payload.role !== "admin") return false;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts and verifies admin authentication from Request headers / cookies
 */
export function verifyAdminRequest(req: Request): boolean {
  // 1. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (verifyAdminToken(token)) return true;
  }

  // 2. Check x-admin-token custom header
  const customHeader = req.headers.get("x-admin-token");
  if (customHeader && verifyAdminToken(customHeader)) return true;

  // 3. Check cookies (admin_token)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (match && match[1]) {
      const cookieToken = decodeURIComponent(match[1]);
      if (verifyAdminToken(cookieToken)) return true;
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
  // If request has valid Admin Master Token, allow
  if (verifyAdminRequest(req)) return true;

  // Otherwise check x-host-key header
  const providedKey = req.headers.get("x-host-key");
  if (roomHostKey && providedKey && roomHostKey === providedKey.trim()) {
    return true;
  }

  return false;
}

/**
 * Sanitizes player names:
 * - Trims whitespace
 * - Strips HTML tags and script-like strings
 * - Removes zero-width, invisible, and control characters
 * - Enforces max length 25
 */
export function sanitizePlayerName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";

  let cleaned = rawName
    // Remove zero-width spaces, joiners, formatting chars
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u202A-\u202E]/g, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove control characters (ASCII 0-31 and 127)
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Replace multiple spaces with a single space
    .replace(/\s+/g, " ")
    .trim();

  // Enforce max 25 characters
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
