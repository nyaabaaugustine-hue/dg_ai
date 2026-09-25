import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prices = await sql`
    SELECT pp.*, qg.code as grade_code, qg.name as grade_name, qg.rank as grade_rank
    FROM part_prices pp
    JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE pp.part_id = ${id} AND pp.active = true
    ORDER BY qg.rank ASC
  `;

  return Response.json(prices, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const result = await sql`
    INSERT INTO part_prices (part_id, quality_grade_id, price, currency, source, active, effective_from)
    VALUES (${id}, ${body.qualityGradeId}, ${body.price}, ${body.currency || "GHS"}, ${body.source}, true, NOW())
    RETURNING *
  `;

  return Response.json(result[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.priceId) return Response.json({ error: "priceId required" }, { status: 400 });

  const result = await sql`
    UPDATE part_prices SET 
      price = ${body.price},
      currency = ${body.currency},
      source = ${body.source},
      effective_to = ${body.effectiveTo},
      updated_at = NOW()
    WHERE id = ${body.priceId} AND part_id = ${id}
    RETURNING *
  `;

  return Response.json(result[0], { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}