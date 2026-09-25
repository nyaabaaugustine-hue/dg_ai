import { sql } from "@/lib/db/sql";
import { verifyAdmin } from "@/lib/auth-cf";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const feedback = await sql`
    SELECT hf.*, p.name as part_name
    FROM human_feedback hf
    LEFT JOIN parts p ON hf.part_id = p.id
    ORDER BY hf.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = await sql`SELECT COUNT(*) as count FROM human_feedback`;

  return Response.json({
    feedback: feedback.map((f: any) => ({
      id: f.id,
      conversationId: f.conversation_id,
      partId: f.part_id,
      feedbackType: f.feedback_type,
      userInput: f.user_input,
      aiResponse: f.ai_response,
      correctionText: f.correction_text,
      status: f.status,
      partName: f.part_name,
      createdAt: f.created_at,
    })),
    total: parseInt(total[0]?.count || "0"),
    page,
    limit,
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function PUT(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id || !body.status) return Response.json({ error: "id and status required" }, { status: 400 });

  await sql`UPDATE human_feedback SET status = ${body.status} WHERE id = ${body.id}`;
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function OPTIONS() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, PUT, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}