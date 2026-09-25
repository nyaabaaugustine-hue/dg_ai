import { sql } from './sql';
import type { EngineeringKnowledge } from './sql';

export async function getEngineeringKnowledgeSQL(partId?: string, queryText?: string): Promise<EngineeringKnowledge[]> {
  let whereClause = "WHERE ek.active = true";
  const conditions: string[] = [];
  const values: any[] = [];

  if (partId) {
    conditions.push(`ek.part_id = $${values.length + 1}`);
    values.push(partId);
  }
  if (queryText) {
    conditions.push(`ek.content ILIKE $${values.length + 1}`);
    values.push(`%${queryText}%`);
  }

  if (conditions.length > 0) {
    whereClause += " AND " + conditions.join(" AND ");
  }

  const queryStr = `
    SELECT * FROM engineering_knowledge ek
    ${whereClause}
    ORDER BY ek.created_at DESC
    LIMIT 10
  `;
  const docs = await sql.query(queryStr, values);

  return docs.map((d: any) => ({
    id: d.id,
    partId: d.part_id,
    vehicleId: d.vehicle_id,
    title: d.title,
    content: d.content,
    kind: d.kind,
    source: d.source,
  }));
}