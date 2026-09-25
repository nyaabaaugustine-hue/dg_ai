import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conv = await sql`SELECT * FROM conversations WHERE id = ${id}`;
  if (!conv.length) return Response.json({ error: "Not found" }, { status: 404 });

  const messages = await sql`
    SELECT * FROM conversation_messages WHERE conversation_id = ${id} ORDER BY created_at ASC
  `;

  const c = conv[0];
  return Response.json({
    id: c.id,
    sessionId: c.session_id,
    title: c.title,
    startedAt: c.started_at,
    messages: messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}