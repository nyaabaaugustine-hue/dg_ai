import { sql } from './sql';
import type { Vehicle } from './sql';

export async function getAllVehiclesSQL(): Promise<Vehicle[]> {
  const vehicles = await sql`
    SELECT * FROM vehicles WHERE active = true ORDER BY manufacturer, model
  `;

  return vehicles.map((v: any) => ({
    id: v.id,
    manufacturer: v.manufacturer,
    model: v.model,
    generation: v.generation,
    engine: v.engine,
    yearFrom: v.year_from,
    yearTo: v.year_to,
    notes: v.notes,
  }));
}

export async function createVehicleSQL(data: {
  manufacturer: string;
  model: string;
  generation?: string;
  engine?: string;
  yearFrom?: number;
  yearTo?: number;
  notes?: string;
}) {
  const result = await sql`
    INSERT INTO vehicles (manufacturer, model, generation, engine, year_from, year_to, notes)
    VALUES (${data.manufacturer}, ${data.model}, ${data.generation}, ${data.engine}, ${data.yearFrom}, ${data.yearTo}, ${data.notes})
    RETURNING *
  `;
  return result[0];
}

export async function updateVehicleSQL(id: string, data: Partial<Vehicle>) {
  const sets: string[] = [];
  const values: any[] = [];
  if (data.manufacturer) { sets.push("manufacturer = $" + (values.length + 1)); values.push(data.manufacturer); }
  if (data.model) { sets.push("model = $" + (values.length + 1)); values.push(data.model); }
  if (data.generation !== undefined) { sets.push("generation = $" + (values.length + 1)); values.push(data.generation); }
  if (data.engine !== undefined) { sets.push("engine = $" + (values.length + 1)); values.push(data.engine); }
  if (data.yearFrom !== undefined) { sets.push("year_from = $" + (values.length + 1)); values.push(data.yearFrom); }
  if (data.yearTo !== undefined) { sets.push("year_to = $" + (values.length + 1)); values.push(data.yearTo); }
  if (data.notes !== undefined) { sets.push("notes = $" + (values.length + 1)); values.push(data.notes); }
  
  if (sets.length === 0) return null;
  
  sets.push("updated_at = NOW()");
  values.push(id);
  const query = `UPDATE vehicles SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return result[0];
}

export async function deleteVehicleSQL(id: string) {
  await sql`UPDATE vehicles SET active = false WHERE id = ${id}`;
}