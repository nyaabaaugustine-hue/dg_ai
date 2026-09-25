import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partId = searchParams.get("partId");
  const vehicleId = searchParams.get("vehicleId");

  let whereClause = sql``;
  if (partId) whereClause = sql`WHERE pc.part_id = ${partId}`;
  else if (vehicleId) whereClause = sql`WHERE pc.vehicle_id = ${vehicleId}`;

  const comps = await sql`
    SELECT pc.*, p.name as part_name, v.manufacturer, v.model
    FROM part_compatibility pc
    JOIN parts p ON pc.part_id = p.id
    JOIN vehicles v ON pc.vehicle_id = v.id
    ${whereClause}
    ORDER BY v.manufacturer, v.model
  `;

  return Response.json(comps, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = await sql`
    INSERT INTO part_compatibility (part_id, vehicle_id, status, notes, confidence, source)
    VALUES (${body.partId}, ${body.vehicleId}, ${body.status || "UNKNOWN"}, ${body.notes}, ${body.confidence || 1}, ${body.source})
    ON CONFLICT (part_id, vehicle_id) DO UPDATE SET
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      confidence = EXCLUDED.confidence,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING *
  `;
  return Response.json(result[0], { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}