import { SignJWT } from "jose";
import { issueSession, checkCredentials, adminCredentials } from "@/lib/auth";
import { verifyAdmin } from "@/lib/auth-cf";

const SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || "dev-secret-change-in-production");

const SESSION_COOKIE = "degoony_admin";
const SESSION_DAYS = 7;

function sessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = String(body.email ?? body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { username } = adminCredentials();
  const token = issueSession();
  const jwt = await new SignJWT({ id: "admin", email: username, name: "Admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(SECRET);

  return Response.json(
    { success: true, user: { id: "admin", email: username, name: "Admin" } },
    {
      headers: {
        "Set-Cookie": sessionCookie(token),
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function DELETE() {
  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function GET(req: Request) {
  const user = await verifyAdmin(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ user });
}
