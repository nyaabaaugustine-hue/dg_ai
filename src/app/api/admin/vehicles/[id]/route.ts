import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const v = await sql`SELECT * FROM vehicles WHERE id = ${id}`;
  if (!v.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(v[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  if (body.manufacturer !== undefined) { sets.push("manufacturer = $" + (values.length + 1)); values.push(body.manufacturer); }
  if (body.model !== undefined) { sets.push("model = $" + (values.length + 1)); values.push(body.model); }
  if (body.generation !== undefined) { sets.push("generation = $" + (values.length + 1)); values.push(body.generation); }
  if (body.engine !== undefined) { sets.push("engine = $" + (values.length + 1)); values.push(body.engine); }
  if (body.yearFrom !== undefined) { sets.push("year_from = $" + (values.length + 1)); values.push(body.yearFrom); }
  if (body.yearTo !== undefined) { sets.push("year_to = $" + (values.length + 1)); values.push(body.yearTo); }
  if (body.notes !== undefined) { sets.push("notes = $" + (values.length + 1)); values.push(body.notes); }
  if (body.active !== undefined) { sets.push("active = $" + (values.length + 1)); values.push(body.active); }

  if (sets.length === 0) return Response.json({ error: "No fields" }, { status: 400 });

  sets.push("updated_at = NOW()");
  values.push(id);
  const query = `UPDATE vehicles SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return Response.json(result[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`UPDATE vehicles SET active = false WHERE id = ${id}`;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}