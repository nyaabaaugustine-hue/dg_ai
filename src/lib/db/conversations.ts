import { sql } from './sql';

export interface ConversationWithMessages {
  id: string;
  sessionId: string;
  title: string | null;
  startedAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolsCalled: any | null;
  retrievedRecords: any | null;
  model: string | null;
  createdAt: Date;
}

export async function getConversationsSQL(page = 1, limit = 20, search?: string) {
  const offset = (page - 1) * limit;
  let whereClause = sql``;
  
  if (search) {
    whereClause = sql`WHERE c.title ILIKE ${`%${search}%`} OR c.session_id ILIKE ${`%${search}%`}`;
  }

  const conversations = await sql`
    SELECT c.*, 
           COUNT(cm.id) as message_count
    FROM conversations c
    LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = await sql`
    SELECT COUNT(*) as count FROM conversations c ${whereClause}
  `;

  return {
    conversations: conversations.map((c: any) => ({
      id: c.id,
      sessionId: c.session_id,
      title: c.title,
      startedAt: new Date(c.started_at),
      updatedAt: new Date(c.updated_at),
      endedAt: c.ended_at ? new Date(c.ended_at) : null,
      messageCount: parseInt(c.message_count),
    })),
    total: parseInt(total[0]?.count || '0'),
    page,
    limit,
  };
}

export async function getConversationWithMessagesSQL(id: string): Promise<ConversationWithMessages | null> {
  const conv = await sql`
    SELECT * FROM conversations WHERE id = ${id}
  `;
  if (!conv.length) return null;

  const messages = await sql`
    SELECT * FROM conversation_messages 
    WHERE conversation_id = ${id}
    ORDER BY created_at ASC
  `;

  return {
    id: conv[0].id,
    sessionId: conv[0].session_id,
    title: conv[0].title,
    startedAt: new Date(conv[0].started_at),
    updatedAt: new Date(conv[0].updated_at),
    endedAt: conv[0].ended_at ? new Date(conv[0].ended_at) : null,
    messages: messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      toolsCalled: m.tools_called,
      retrievedRecords: m.retrieved_records,
      model: m.model,
      createdAt: new Date(m.created_at),
    })),
  };
}