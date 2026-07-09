import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "ticket_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  return process.env.AUTH_SECRET || "please-change-auth-secret";
}

function safeEqualString(a, b) {
  const aBuffer = Buffer.from(a || "", "utf8");
  const bBuffer = Buffer.from(b || "", "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(username) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ username, expiresAt }),
    "utf8"
  ).toString("base64url");

  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payload, signature] = token.split(".");
  const expected = signPayload(payload);

  if (!safeEqualString(signature, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      return null;
    }

    return {
      username: parsed.username,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function getSessionFromCookieStore() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function getClearedSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };
}

export function isValidAdminCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "admin";

  return safeEqualString(username, expectedUser) && safeEqualString(password, expectedPass);
}
