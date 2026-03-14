import "server-only";

import { Buffer } from "node:buffer";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "bowen_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function encodeJson(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function decodeSignature(value) {
  return Buffer.from(value, "base64url");
}

async function importSessionKey() {
  const secret = readEnv("SESSION_SECRET");

  if (!secret) {
    return null;
  }

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload) {
  const key = await importSessionKey();

  if (!key) {
    throw new Error("SESSION_SECRET is not configured");
  }

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

async function verifySessionValue(value) {
  const key = await importSessionKey();

  if (!key) {
    return false;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return false;
  }

  let isValidSignature = false;

  try {
    isValidSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeSignature(signature),
      encoder.encode(payload)
    );
  } catch {
    return false;
  }

  if (!isValidSignature) {
    return false;
  }

  try {
    const session = decodeJson(payload);
    return session?.sub === "admin" && typeof session.exp === "number" && session.exp > Date.now();
  } catch {
    return false;
  }
}

async function createSessionValue() {
  const payload = encodeJson({
    sub: "admin",
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  });

  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

function adminCredentials() {
  const username = readEnv("ADMIN_USERNAME");
  const password = readEnv("ADMIN_PASSWORD");

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function isAdminAuthConfigured() {
  return Boolean(adminCredentials() && readEnv("SESSION_SECRET"));
}

export function validateAdminCredentials(username, password) {
  const credentials = adminCredentials();

  if (!credentials || !readEnv("SESSION_SECRET")) {
    return {
      ok: false,
      error: "管理员配置未完成",
    };
  }

  if (username === credentials.username && password === credentials.password) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "用户名或密码错误",
  };
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;

  if (!session) {
    return false;
  }

  return verifySessionValue(session);
}

export async function requireAdmin() {
  if (await isAdminAuthenticated()) {
    return;
  }

  throw new Error("Unauthorized");
}

export async function setAdminSession() {
  const store = await cookies();
  const value = await createSessionValue();

  store.set({
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();

  store.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
