import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partId = searchParams.get("partId");

  let whereClause = sql``;
  if (partId) whereClause = sql`WHERE pa.part_id = ${partId}`;

  const aliases = await sql`
    SELECT pa.*, p.name as part_name
    FROM part_aliases pa
    JOIN parts p ON pa.part_id = p.id
    ${whereClause}
    ORDER BY p.name, pa.alias
  `;

  return Response.json(aliases, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = await sql`
    INSERT INTO part_aliases (part_id, alias, language, source, confidence)
    VALUES (${body.partId}, ${body.alias}, ${body.language || "en"}, ${body.source}, ${body.confidence || 1})
    RETURNING *
  `;
  return Response.json(result[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}