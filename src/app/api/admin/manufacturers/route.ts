import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const manufacturers = await sql`SELECT * FROM manufacturers WHERE active = true ORDER BY name`;
  return Response.json(manufacturers, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = await sql`
    INSERT INTO manufacturers (name, website, country, notes, active)
    VALUES (${body.name}, ${body.website}, ${body.country}, ${body.notes}, true)
    RETURNING *
  `;
  return Response.json(result[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}