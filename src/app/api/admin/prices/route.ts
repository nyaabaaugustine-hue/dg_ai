import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prices = await sql`
    SELECT pp.*, p.name as part_name, qg.code as grade_code, qg.name as grade_name, qg.rank as grade_rank
    FROM part_prices pp
    JOIN parts p ON pp.part_id = p.id
    JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE pp.active = true
    ORDER BY p.name, qg.rank
  `;

  return Response.json(prices, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.partId || !body.qualityGradeId || body.price == null) {
    return Response.json({ error: "partId, qualityGradeId, price required" }, { status: 400 });
  }

  const created = await sql`
    WITH deactivated AS (
      UPDATE part_prices
      SET active = false, effective_to = NOW(), updated_at = NOW()
      WHERE part_id = ${body.partId}
        AND quality_grade_id = ${body.qualityGradeId}
        AND active = true
      RETURNING id
    )
    INSERT INTO part_prices (part_id, quality_grade_id, price, currency, source, notes, active, effective_from)
    VALUES (${body.partId}, ${body.qualityGradeId}, ${body.price}, ${body.currency || "GHS"}, ${body.source || "admin"}, ${body.notes || null}, true, NOW())
    RETURNING *
  `;

  return Response.json(created[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await sql`
    UPDATE part_prices
    SET active = false, effective_to = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
