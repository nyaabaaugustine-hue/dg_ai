import { jwtVerify } from "jose";
import { createHmac, timingSafeEqual } from "node:crypto";

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || "dev-secret-change-in-production");

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split("; ")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    out[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return out;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return false;
  const expected = createHmac("sha256", secret).update(expStr).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}

export async function verifyAdmin(req: Request): Promise<AdminUser | null> {
  const cookies = parseCookies(req.headers.get("cookie"));

  if (verifySessionToken(cookies["degoony_admin"])) {
    return { id: "admin", email: "admin", name: "Admin" };
  }

  const token = cookies["admin_session"];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminUser;
  } catch {
    return null;
  }
}
