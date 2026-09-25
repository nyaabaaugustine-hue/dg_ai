import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  if (body.status !== undefined) { sets.push("status = $" + (values.length + 1)); values.push(body.status); }
  if (body.notes !== undefined) { sets.push("notes = $" + (values.length + 1)); values.push(body.notes); }
  if (body.confidence !== undefined) { sets.push("confidence = $" + (values.length + 1)); values.push(body.confidence); }
  if (body.source !== undefined) { sets.push("source = $" + (values.length + 1)); values.push(body.source); }

  if (sets.length === 0) return Response.json({ error: "No fields" }, { status: 400 });

  sets.push("updated_at = NOW()");
  values.push(id);
  const query = `UPDATE part_compatibility SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return Response.json(result[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM part_compatibility WHERE id = ${id}`;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}