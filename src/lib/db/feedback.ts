import { sql } from './sql';
import type { HumanFeedback } from './sql';

export async function recordFeedbackSQL(input: {
  feedbackType: string;
  userInput?: string;
  aiResponse?: string;
  correctionText?: string;
  partId?: string;
  conversationId?: string;
}) {
  return sql`
    INSERT INTO human_feedback (id, feedback_type, user_input, ai_response, correction_text, part_id, conversation_id, status, created_by)
    VALUES (
      ${crypto.randomUUID()},
      ${input.feedbackType}, 
      ${input.userInput}, 
      ${input.aiResponse}, 
      ${input.correctionText}, 
      ${input.partId}, 
      ${input.conversationId ?? null}, 
      'open', 
      'system'
    )
    RETURNING *
  `;
}

export async function getFeedbackSQL(limit = 50, offset = 0): Promise<HumanFeedback[]> {
  const feedback = await sql`
    SELECT hf.*, p.name as part_name
    FROM human_feedback hf
    LEFT JOIN parts p ON hf.part_id = p.id
    ORDER BY hf.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return feedback.map((f: any) => ({
    id: f.id,
    conversationId: f.conversation_id,
    partId: f.part_id,
    partName: f.part_name,
    feedbackType: f.feedback_type,
    userInput: f.user_input,
    aiResponse: f.ai_response,
    correctionText: f.correction_text,
    status: f.status,
    createdBy: f.created_by,
    createdAt: new Date(f.created_at),
  }));
}

export async function updateFeedbackStatusSQL(id: string, status: string) {
  await sql`
    UPDATE human_feedback SET status = ${status} WHERE id = ${id}
  `;
}