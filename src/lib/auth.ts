import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "degoony_admin";
const SESSION_DAYS = 7;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET must be set to a string of at least 16 characters.");
  }
  return s;
}

export function signToken(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueSession(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${exp}`;
  return `${payload}.${signToken(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const expected = signToken(expStr);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}

export function adminCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "",
  };
}

export function checkCredentials(username: string, password: string): boolean {
  const { username: u, password: p } = adminCredentials();
  return username === u && password === p && p.length > 0;
}

export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!verifySession(store.get(COOKIE_NAME)?.value)) {
    redirect("/admin/login");
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, issueSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
