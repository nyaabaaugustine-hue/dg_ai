import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const part = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.id = ${id}
  `;

  if (!part.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const prices = await sql`
    SELECT pp.*, qg.code as grade_code, qg.name as grade_name, qg.rank as grade_rank
    FROM part_prices pp
    JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE pp.part_id = ${id} AND pp.active = true
    ORDER BY qg.rank ASC
  `;

  const aliases = await sql`SELECT * FROM part_aliases WHERE part_id = ${id}`;
  const compat = await sql`
    SELECT pc.*, v.manufacturer, v.model
    FROM part_compatibility pc
    JOIN vehicles v ON pc.vehicle_id = v.id
    WHERE pc.part_id = ${id}
  `;

  const p = part[0];
  return Response.json({
    ...p,
    prices,
    aliases,
    compatibilities: compat,
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const values: any[] = [];
  if (body.name !== undefined) { sets.push("name = $" + (values.length + 1)); values.push(body.name); }
  if (body.description !== undefined) { sets.push("description = $" + (values.length + 1)); values.push(body.description); }
  if (body.category !== undefined) { sets.push("category = $" + (values.length + 1)); values.push(body.category); }
  if (body.subcategory !== undefined) { sets.push("subcategory = $" + (values.length + 1)); values.push(body.subcategory); }
  if (body.partNumber !== undefined) { sets.push("part_number = $" + (values.length + 1)); values.push(body.partNumber); }
  if (body.vehicleSystem !== undefined) { sets.push("vehicle_system = $" + (values.length + 1)); values.push(body.vehicleSystem); }
  if (body.manufacturerId !== undefined) { sets.push("manufacturer_id = $" + (values.length + 1)); values.push(body.manufacturerId); }
  if (body.stockQty !== undefined) { sets.push("stock_qty = $" + (values.length + 1)); values.push(body.stockQty); }
  if (body.active !== undefined) { sets.push("active = $" + (values.length + 1)); values.push(body.active); }

  if (sets.length === 0) return Response.json({ error: "No fields to update" }, { status: 400 });

  sets.push("updated_at = NOW()");
  values.push(id);
  const query = `UPDATE parts SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return Response.json(result[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`UPDATE parts SET active = false WHERE id = ${id}`;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}