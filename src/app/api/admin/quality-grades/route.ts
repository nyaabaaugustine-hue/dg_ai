import { sql } from "@/lib/db/sql";

export async function GET() {
  const grades = await sql`
    SELECT id, code, name, rank, description
    FROM quality_grades
    WHERE active = true
    ORDER BY rank ASC
  `;
  return Response.json(grades, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
