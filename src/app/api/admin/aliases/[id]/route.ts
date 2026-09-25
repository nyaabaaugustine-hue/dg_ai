import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  if (body.alias !== undefined) { sets.push("alias = $" + (values.length + 1)); values.push(body.alias); }
  if (body.language !== undefined) { sets.push("language = $" + (values.length + 1)); values.push(body.language); }
  if (body.source !== undefined) { sets.push("source = $" + (values.length + 1)); values.push(body.source); }
  if (body.confidence !== undefined) { sets.push("confidence = $" + (values.length + 1)); values.push(body.confidence); }

  if (sets.length === 0) return Response.json({ error: "No fields" }, { status: 400 });

  values.push(id);
  const query = `UPDATE part_aliases SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return Response.json(result[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM part_aliases WHERE id = ${id}`;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}