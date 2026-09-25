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

  let whereClause = sql``;
  if (search) {
    whereClause = sql`WHERE c.title ILIKE ${`%${search}%`} OR c.session_id ILIKE ${`%${search}%`}`;
  }

  const conversations = await sql`
    SELECT c.*, COUNT(cm.id) as message_count
    FROM conversations c
    LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = await sql`SELECT COUNT(*) as count FROM conversations c ${whereClause}`;

  return Response.json({
    conversations: conversations.map((c: any) => ({
      id: c.id,
      sessionId: c.session_id,
      title: c.title,
      startedAt: c.started_at,
      messageCount: parseInt(c.message_count) || 0,
    })),
    total: parseInt(total[0]?.count || "0"),
    page,
    limit,
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}