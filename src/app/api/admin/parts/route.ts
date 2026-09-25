import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let whereClause = sql`WHERE p.active = true`;
  if (search) {
    whereClause = sql`${whereClause} AND (p.name ILIKE ${`%${search}%`} OR p.part_number ILIKE ${`%${search}%`})`;
  }

  const parts = await sql`
    SELECT p.*, m.name as manufacturer_name,
           json_agg(json_build_object('grade', qg.name, 'price', pp.price, 'currency', pp.currency, 'grade_code', qg.code)) as prices
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    LEFT JOIN part_prices pp ON p.id = pp.part_id AND pp.active = true
    LEFT JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    ${whereClause}
    GROUP BY p.id, m.name
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = await sql`
    SELECT COUNT(*) as count FROM parts p ${whereClause}
  `;

  return Response.json({
    parts: parts.map((p: any) => ({
      ...p,
      prices: p.prices || [],
    })),
    total: parseInt(total[0]?.count || "0"),
    page,
    limit,
  }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return Response.json({ error: "name required" }, { status: 400 });

  const result = await sql`
    INSERT INTO parts (name, description, category, subcategory, part_number, vehicle_system, manufacturer_id, stock_qty, active)
    VALUES (
      ${body.name},
      ${body.description ?? null},
      ${body.category ?? null},
      ${body.subcategory ?? null},
      ${body.partNumber ?? null},
      ${body.vehicleSystem ?? null},
      ${body.manufacturerId || null},
      ${body.stockQty ?? 0},
      ${body.active !== false}
    )
    RETURNING *
  `;

  if (Array.isArray(body.aliases) && body.aliases.length) {
    for (const alias of body.aliases) {
      const a = String(alias || "").trim();
      if (!a) continue;
      await sql`
        INSERT INTO part_aliases (part_id, alias, language, source, confidence)
        VALUES (${result[0].id}, ${a}, 'en', 'admin', 1)
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return Response.json(result[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}