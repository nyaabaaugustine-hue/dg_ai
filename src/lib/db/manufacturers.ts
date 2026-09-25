import { sql } from './sql';
import type { Manufacturer } from './sql';

export async function searchManufacturerSQL(name: string) {
  const manufacturers = await sql`
    SELECT * FROM manufacturers 
    WHERE name ILIKE ${`%${name}%`} AND active = true
    LIMIT 5
  `;

  return manufacturers.map((m: any) => ({
    id: m.id,
    name: m.name,
    website: m.website,
    country: m.country,
    notes: m.notes,
  }));
}

export async function getAllManufacturersSQL(): Promise<Manufacturer[]> {
  const manufacturers = await sql`
    SELECT * FROM manufacturers WHERE active = true ORDER BY name
  `;

  return manufacturers.map((m: any) => ({
    id: m.id,
    name: m.name,
    website: m.website,
    country: m.country,
    notes: m.notes,
  }));
}

export async function createManufacturerSQL(data: { name: string; website?: string; country?: string; notes?: string }) {
  const result = await sql`
    INSERT INTO manufacturers (name, website, country, notes)
    VALUES (${data.name}, ${data.website}, ${data.country}, ${data.notes})
    RETURNING *
  `;
  return result[0];
}

export async function updateManufacturerSQL(id: string, data: Partial<{ name: string; website: string; country: string; notes: string }>) {
  const sets: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { sets.push("name = $" + (values.length + 1)); values.push(data.name); }
  if (data.website !== undefined) { sets.push("website = $" + (values.length + 1)); values.push(data.website); }
  if (data.country !== undefined) { sets.push("country = $" + (values.length + 1)); values.push(data.country); }
  if (data.notes !== undefined) { sets.push("notes = $" + (values.length + 1)); values.push(data.notes); }
  
  if (sets.length === 0) return null;
  
  sets.push("updated_at = NOW()");
  values.push(id);
  const query = `UPDATE manufacturers SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`;
  const result = await sql.query(query, values);
  return result[0];
}

export async function deleteManufacturerSQL(id: string) {
  await sql`UPDATE manufacturers SET active = false WHERE id = ${id}`;
}