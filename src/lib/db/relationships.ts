import { sql } from './sql';
import type { Recommendation } from './sql';

export async function findRelatedPartsSQL(partId: string) {
  const relationships = await sql`
    SELECT pr.*, sp.name as source_name, tp.name as target_name
    FROM part_relationships pr
    JOIN parts sp ON pr.source_part_id = sp.id
    JOIN parts tp ON pr.target_part_id = tp.id
    WHERE pr.source_part_id = ${partId} AND pr.active = true
  `;

  const recommendations = await sql`
    SELECT r.*, tp.name as trigger_name, rp.name as recommended_name
    FROM recommendations r
    JOIN parts tp ON r.trigger_part_id = tp.id
    JOIN parts rp ON r.recommended_part_id = rp.id
    WHERE r.trigger_part_id = ${partId} AND r.active = true
    ORDER BY r.priority ASC
  `;

  return {
    relationships: relationships.map((r: any) => ({
      source: r.source_name,
      target: r.target_name,
      targetId: r.target_part_id,
      type: r.relationship_type,
      reason: r.reason,
      confidence: r.confidence,
    })),
    recommendations: recommendations.map((r: any) => ({
      trigger: r.trigger_name,
      recommended: r.recommended_name,
      recommendedId: r.recommended_part_id,
      type: r.recommendation_type,
      reason: r.reason,
      priority: r.priority,
    })),
  };
}

export async function getRecommendationsSQL(partId: string): Promise<Recommendation[]> {
  const recommendations = await sql`
    SELECT r.*, tp.name as trigger_name, rp.name as recommended_name
    FROM recommendations r
    JOIN parts tp ON r.trigger_part_id = tp.id
    JOIN parts rp ON r.recommended_part_id = rp.id
    WHERE r.trigger_part_id = ${partId} AND r.active = true
    ORDER BY r.priority ASC
  `;

  return recommendations.map((r: any) => ({
    id: r.id,
    triggerPartId: r.trigger_part_id,
    recommendedPartId: r.recommended_part_id,
    triggerPartName: r.trigger_name,
    recommendedPartName: r.recommended_name,
    type: r.recommendation_type,
    reason: r.reason,
    priority: r.priority,
  }));
}