import { sql } from './sql';

export async function checkCompatibilitySQL(partId: string, vehicleQuery?: string) {
  let vehicles;
  if (vehicleQuery) {
    vehicles = await sql`
      SELECT * FROM vehicles 
      WHERE (model ILIKE ${`%${vehicleQuery}%`} OR manufacturer ILIKE ${`%${vehicleQuery}%`})
      AND active = true
      LIMIT 5
    `;
  } else {
    vehicles = await sql`
      SELECT * FROM vehicles WHERE active = true LIMIT 50
    `;
  }

  if (vehicles.length === 0) return [];

  const vehicleIds = vehicles.map(v => v.id);
  const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ');
  const query = `
    SELECT pc.*, v.manufacturer, v.model
    FROM part_compatibility pc
    JOIN vehicles v ON pc.vehicle_id = v.id
    WHERE pc.part_id = $${vehicleIds.length + 1} AND pc.vehicle_id IN (${placeholders})
  `;
  const values = [...vehicleIds, partId];
  const comps = await sql.query(query, values);

  return comps.map((c: any) => ({
    vehicle: `${c.manufacturer} ${c.model}`,
    status: c.status,
    notes: c.notes,
    confidence: c.confidence,
  }));
}