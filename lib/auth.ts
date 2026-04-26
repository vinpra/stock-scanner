import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

type StoredUser = {
  userId: string;
  passwordHash: string;
  createdAt: number;
};

const SESSION_COOKIE = "stock_scanner_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-only-auth-secret";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
}

export function normalizeUserId(value: string) {
  return value.trim().toLowerCase();
}

export function getUserKey(userId: string) {
  return `user:${normalizeUserId(userId)}`;
}

export function getPortfolioKey(userId: string) {
  return `portfolio:${normalizeUserId(userId)}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expected);
}

export function createSessionToken(userId: string) {
  const payload: SessionPayload = {
    userId: normalizeUserId(userId),
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.userId || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export type { StoredUser };
