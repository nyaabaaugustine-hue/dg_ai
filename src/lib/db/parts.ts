import { sql } from './sql';
import type { SearchResult, PartDetail, PartPrice } from './sql';

export async function searchPartsSQL(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const tokens = tokenize(q);

  const exact = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.active = true AND p.name ILIKE ${lower}
    LIMIT ${limit}
  `;

  const byNum = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.active = true AND p.part_number ILIKE ${`%${q}%`}
    LIMIT ${limit}
  `;

  const aliasParts = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    JOIN part_aliases pa ON pa.part_id = p.id
    WHERE p.active = true AND pa.alias ILIKE ${lower}
    LIMIT ${limit}
  `;

  const contains = await sql`
    SELECT DISTINCT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    LEFT JOIN part_aliases pa ON pa.part_id = p.id
    WHERE p.active = true 
      AND (p.name ILIKE ${`%${lower}%`} OR pa.alias ILIKE ${`%${lower}%`})
    LIMIT ${limit * 2}
  `;

  let fuzzy: typeof contains = [];
  if (tokens.length > 1) {
    const conditions = tokens.map(t => 
      `(p.name ILIKE '%${t}%' OR EXISTS (
        SELECT 1 FROM part_aliases pa WHERE pa.part_id = p.id AND pa.alias ILIKE '%${t}%'
      ))`
    );
    const whereClause = conditions.join(' AND ');
    fuzzy = await sql.query(
      `SELECT p.*, m.name as manufacturer_name FROM parts p LEFT JOIN manufacturers m ON p.manufacturer_id = m.id WHERE p.active = true AND ${whereClause} LIMIT ${limit * 2}`
    );
  }

  const idOrder: { id: string; match: SearchResult['match'] }[] = [];
  exact.forEach((p) => idOrder.push({ id: p.id, match: 'exact' }));
  byNum.forEach((p) => idOrder.push({ id: p.id, match: 'part_number' }));
  aliasParts.forEach((p) => idOrder.push({ id: p.id, match: 'alias' }));
  contains.forEach((p) => idOrder.push({ id: p.id, match: 'contains' }));
  fuzzy.forEach((p) => idOrder.push({ id: p.id, match: 'fuzzy' }));

  const seen = new Set<string>();
  const ordered: { id: string; match: SearchResult['match'] }[] = [];
  for (const e of idOrder) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      ordered.push(e);
    }
  }

  const partIds = ordered.slice(0, limit).map((o) => o.id);
  if (partIds.length === 0) return [];

  const placeholders = partIds.map((_, i) => `$${i + 1}`).join(', ');
  const partsWithPrices = await sql.query(
    `SELECT p.*, m.name as manufacturer_name,
           json_agg(json_build_object('grade', qg.name, 'price', pp.price, 'currency', pp.currency, 'grade_code', qg.code)) as prices
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    LEFT JOIN part_prices pp ON p.id = pp.part_id AND pp.active = true
    LEFT JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE p.id IN (${placeholders}) AND p.active = true
    GROUP BY p.id, m.name`,
    partIds
  );

  const byId = new Map(ordered.map((o) => [o.id, o.match]));
  const partsMap = new Map(partsWithPrices.map(p => [p.id, p]));

  return partIds.map((id) => {
    const part = partsMap.get(id);
    if (!part) return null;
    return {
      id: part.id,
      name: part.name,
      partNumber: part.part_number,
      category: part.category,
      vehicleSystem: part.vehicle_system,
      manufacturer: part.manufacturer_name,
      stockQty: part.stock_qty,
      prices: (part.prices || []).map((pp: any) => ({
        grade: pp.grade,
        price: fmtPrice(pp),
        currency: pp.currency,
      })),
      match: byId.get(id) ?? 'fuzzy',
    };
  }).filter(Boolean) as SearchResult[];
}

export async function getPartSQL(partId: string): Promise<PartDetail | null> {
  const part = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.id = ${partId}
  `;
  if (!part.length) return null;

  const prices = await sql`
    SELECT pp.*, qg.code as grade_code, qg.name as grade_name, qg.rank as grade_rank
    FROM part_prices pp
    JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE pp.part_id = ${partId} AND pp.active = true
    ORDER BY qg.rank ASC
  `;

  const aliases = await sql`SELECT * FROM part_aliases WHERE part_id = ${partId}`;
  const compat = await sql`
    SELECT pc.*, v.manufacturer, v.model
    FROM part_compatibility pc
    JOIN vehicles v ON pc.vehicle_id = v.id
    WHERE pc.part_id = ${partId}
  `;

  const p = part[0];
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory,
    partNumber: p.part_number,
    vehicleSystem: p.vehicle_system,
    manufacturerId: p.manufacturer_id,
    manufacturerName: p.manufacturer_name,
    stockQty: p.stock_qty,
    prices: prices.map((pp: any) => ({
      id: pp.id,
      partId: pp.part_id,
      qualityGradeId: pp.quality_grade_id,
      gradeCode: pp.grade_code,
      gradeName: pp.grade_name,
      gradeRank: pp.grade_rank,
      price: pp.price.toString(),
      currency: pp.currency,
      source: pp.source,
    })),
    aliases: aliases.map((a: any) => ({
      id: a.id,
      partId: a.part_id,
      alias: a.alias,
      language: a.language,
      source: a.source,
      confidence: a.confidence,
    })),
    compatibilities: compat.map((c: any) => ({
      id: c.id,
      partId: c.part_id,
      vehicleId: c.vehicle_id,
      vehicleManufacturer: c.manufacturer,
      vehicleModel: c.model,
      status: c.status,
      notes: c.notes,
      confidence: c.confidence,
    })),
  };
}

export async function getCurrentPriceSQL(partId: string) {
  const part = await sql`
    SELECT p.*, m.name as manufacturer_name
    FROM parts p
    LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.id = ${partId}
  `;
  if (!part.length) return null;

  const prices = await sql`
    SELECT pp.*, qg.code as grade_code, qg.name as grade_name, qg.rank as grade_rank
    FROM part_prices pp
    JOIN quality_grades qg ON pp.quality_grade_id = qg.id
    WHERE pp.part_id = ${partId} AND pp.active = true AND pp.effective_to IS NULL
    ORDER BY qg.rank ASC
  `;

  const p = part[0];
  return {
    partId: p.id,
    name: p.name,
    prices: prices.map((pp: any) => ({
      grade: pp.grade_name,
      gradeCode: pp.grade_code,
      price: fmtPrice(pp),
      currency: pp.currency,
      source: pp.source,
    })),
  };
}

export async function searchPricesSQL(query: string, limit = 8) {
  const parts = await searchPartsSQL(query, limit);
  const out: { name: string; partId: string; prices: { grade: string; price: string }[] }[] = [];
  for (const p of parts) {
    const cur = await getCurrentPriceSQL(p.id);
    if (cur) out.push({ name: p.name, partId: p.id, prices: cur.prices.map((x) => ({ grade: x.grade, price: x.price })) });
  }
  return out;
}

export type PriceHistoryEntry = {
  grade: string;
  gradeCode: string;
  price: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  source: string | null;
  notes: string | null;
};

export async function getPriceHistorySQL(
  partId: string,
  gradeCode?: string,
): Promise<{ partId: string; name: string; entries: PriceHistoryEntry[] }> {
  const part = await sql`SELECT id, name FROM parts WHERE id = ${partId}`;
  if (!part.length) throw new Error("part not found");

  let rows: any[];
  if (gradeCode) {
    rows = await sql`
      SELECT pp.price, pp.currency, pp.effective_from, pp.effective_to, pp.active, pp.source, pp.notes,
             qg.code as grade_code, qg.name as grade_name
      FROM part_prices pp
      JOIN quality_grades qg ON pp.quality_grade_id = qg.id
      WHERE pp.part_id = ${partId} AND qg.code = ${gradeCode}
      ORDER BY pp.effective_from DESC
    `;
  } else {
    rows = await sql`
      SELECT pp.price, pp.currency, pp.effective_from, pp.effective_to, pp.active, pp.source, pp.notes,
             qg.code as grade_code, qg.name as grade_name
      FROM part_prices pp
      JOIN quality_grades qg ON pp.quality_grade_id = qg.id
      WHERE pp.part_id = ${partId}
      ORDER BY qg.rank ASC, pp.effective_from DESC
    `;
  }

  return {
    partId,
    name: part[0].name,
    entries: rows.map((r) => ({
      grade: r.grade_name,
      gradeCode: r.grade_code,
      price: fmtPrice(r),
      currency: r.currency,
      effectiveFrom: r.effective_from instanceof Date ? r.effective_from.toISOString() : String(r.effective_from),
      effectiveTo: r.effective_to ? (r.effective_to instanceof Date ? r.effective_to.toISOString() : String(r.effective_to)) : null,
      active: Boolean(r.active),
      source: r.source,
      notes: r.notes,
    })),
  };
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function fmtPrice(p: { price: string | number }): string {
  return Number(p.price.toString()).toLocaleString(undefined, { minimumFractionDigits: 0 });
}