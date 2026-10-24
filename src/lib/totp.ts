import crypto from "crypto";
import QRCode from "qrcode";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a random 20-byte base32 secret for TOTP
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generate a 6-digit TOTP token for the given time and secret (RFC 6238)
 */
export function generateTotpToken(secret: string, timeStep = 30, forTime = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Math.floor(forTime / 1000 / timeStep);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = (code % 1000000).toString().padStart(6, "0");
  return token;
}

/**
 * Verify a 6-digit TOTP token with time drift window (default ±30s)
 */
export function verifyTotpToken(secret: string, token: string, window = 1): boolean {
  if (!secret || !token || token.length !== 6) return false;
  const now = Date.now();
  const step = 30 * 1000;

  for (let i = -window; i <= window; i++) {
    const expected = generateTotpToken(secret, 30, now + i * step);
    if (expected === token) {
      return true;
    }
  }

  return false;
}

/**
 * Build standard otpauth URL
 */
export function generateOtpAuthUrl(accountName: string, secret: string, issuer = "Quizorra"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Render OTP QR Code as Data URL
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: {
      dark: "#0b0e1e",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generate 8 emergency backup recovery codes (format: XXXX-XXXX)
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude 0, 1, I, O to avoid confusion

  for (let i = 0; i < count; i++) {
    let part1 = "";
    let part2 = "";
    for (let j = 0; j < 4; j++) {
      part1 += chars[crypto.randomInt(0, chars.length)];
      part2 += chars[crypto.randomInt(0, chars.length)];
    }
    codes.push(`${part1}-${part2}`);
  }

  return codes;
}

/**
 * Hash a backup code using SHA-256
 */
export function hashBackupCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
