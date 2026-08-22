import { prisma } from "@/lib/db";

type SearchResult = {
  id: string;
  name: string;
  partNumber: string | null;
  category: string | null;
  vehicleSystem: string | null;
  manufacturer: string | null;
  stockQty: number | null;
  prices: { grade: string; price: string; currency: string }[];
  match: "exact" | "alias" | "part_number" | "contains" | "fuzzy";
};

export function formatStock(qty: number | null): string {
  if (qty === null || qty === undefined) return "stock unknown";
  if (qty <= 0) return "out of stock";
  if (qty <= 5) return `low stock (${qty} left)`;
  return `in stock (${qty})`;
}

function fmtPrice(p: { price: { toString(): string } }) {
  return Number(p.price.toString()).toLocaleString(undefined, { minimumFractionDigits: 0 });
}

async function withPrices(partIds: string[]): Promise<SearchResult[]> {
  if (partIds.length === 0) return [];
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds }, active: true },
    include: {
      manufacturer: true,
      prices: { where: { active: true }, include: { qualityGrade: true }, orderBy: { qualityGrade: { rank: "asc" } } },
    },
  });
  return parts.map((p) => ({
    id: p.id,
    name: p.name,
    partNumber: p.partNumber,
    category: p.category,
    vehicleSystem: p.vehicleSystem,
    manufacturer: p.manufacturer?.name ?? null,
    stockQty: p.stockQty,
    prices: p.prices.map((pp) => ({
      grade: pp.qualityGrade.name,
      price: fmtPrice(pp),
      currency: pp.currency,
    })),
    match: "fuzzy" as const,
  }));
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * DEGOONY part search: exact name > part number > alias > contains > token fuzzy.
 */
export async function searchParts(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const tokens = tokenize(q);

  // 1. Exact name
  const exact = await prisma.part.findMany({
    where: { name: { equals: lower, mode: "insensitive" }, active: true },
    select: { id: true },
    take: limit,
  });
  // 2. Part number
  const byNum = await prisma.part.findMany({
    where: { partNumber: { contains: q, mode: "insensitive" }, active: true },
    select: { id: true },
    take: limit,
  });
  // 3. Alias (exact-ish)
  const aliases = await prisma.partAlias.findMany({
    where: { alias: { equals: lower, mode: "insensitive" } },
    select: { partId: true },
    take: limit,
  });
  const aliasParts = await prisma.part.findMany({
    where: { id: { in: aliases.map((a) => a.partId) }, active: true },
    select: { id: true },
    take: limit,
  });
  // 4. Contains on name or alias
  const contains = await prisma.part.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: lower, mode: "insensitive" } },
        { aliases: { some: { alias: { contains: lower, mode: "insensitive" } } } },
      ],
    },
    select: { id: true },
    take: limit * 2,
  });

  // 5. Token fuzzy (all tokens must be substrings of the name)
  let fuzzy: { id: string }[] = [];
  if (tokens.length > 1) {
    const f = await prisma.part.findMany({
      where: {
        active: true,
        AND: tokens.map((t) => ({
          OR: [
            { name: { contains: t, mode: "insensitive" } },
            { aliases: { some: { alias: { contains: t, mode: "insensitive" } } } },
          ],
        })),
      },
      select: { id: true },
      take: limit * 2,
    });
    fuzzy = f;
  }

  const idOrder: { id: string; match: SearchResult["match"] }[] = [];
  exact.forEach((p) => idOrder.push({ id: p.id, match: "exact" }));
  byNum.forEach((p) => idOrder.push({ id: p.id, match: "part_number" }));
  aliasParts.forEach((p) => idOrder.push({ id: p.id, match: "alias" }));
  contains.forEach((p) => idOrder.push({ id: p.id, match: "contains" }));
  fuzzy.forEach((p) => idOrder.push({ id: p.id, match: "fuzzy" }));

  const seen = new Set<string>();
  const ordered: { id: string; match: SearchResult["match"] }[] = [];
  for (const e of idOrder) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      ordered.push(e);
    }
  }

  const results = await withPrices(ordered.slice(0, limit).map((o) => o.id));
  const byId = new Map(ordered.map((o) => [o.id, o.match]));
  return results.map((r) => ({ ...r, match: byId.get(r.id) ?? "fuzzy" }));
}

export async function getPart(partId: string) {
  return prisma.part.findUnique({
    where: { id: partId },
    include: {
      manufacturer: true,
      aliases: true,
      prices: { include: { qualityGrade: true }, orderBy: { qualityGrade: { rank: "asc" } } },
      compatibilities: { include: { vehicle: true } },
    },
  });
}

/** Current active prices for a part, grouped by quality grade, plus a full detail string. */
export async function getCurrentPrice(partId: string) {
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      prices: {
        where: { active: true, effectiveTo: null },
        include: { qualityGrade: true },
        orderBy: { qualityGrade: { rank: "asc" } },
      },
    },
  });
  if (!part) return null;
  return {
    partId: part.id,
    name: part.name,
    prices: part.prices.map((pp) => ({
      grade: pp.qualityGrade.name,
      gradeCode: pp.qualityGrade.code,
      price: fmtPrice(pp),
      currency: pp.currency,
      source: pp.source,
    })),
  };
}

export async function checkCompatibility(partId: string, vehicleQuery?: string) {
  const vehicles = vehicleQuery
    ? await prisma.vehicle.findMany({
        where: { OR: [{ model: { contains: vehicleQuery, mode: "insensitive" } }, { manufacturer: { contains: vehicleQuery, mode: "insensitive" } }] },
        take: 5,
      })
    : await prisma.vehicle.findMany({ take: 50 });

  const comps = await prisma.partCompatibility.findMany({
    where: { partId, vehicleId: { in: vehicles.map((v) => v.id) } },
    include: { vehicle: true },
  });
  return comps.map((c) => ({
    vehicle: `${c.vehicle.manufacturer} ${c.vehicle.model}`,
    status: c.status,
    notes: c.notes,
    confidence: c.confidence,
  }));
}

export async function findRelatedParts(partId: string) {
  const relationships = await prisma.partRelationship.findMany({
    where: { sourcePartId: partId, active: true },
    include: {
      sourcePart: { select: { name: true } },
      targetPart: { select: { id: true, name: true } },
    },
  });
  const recommendations = await prisma.recommendation.findMany({
    where: { triggerPartId: partId, active: true },
    include: {
      triggerPart: { select: { name: true } },
      recommendedPart: { select: { id: true, name: true } },
    },
    orderBy: { priority: "asc" },
  });
  return {
    relationships: relationships.map((r) => ({
      source: r.sourcePart.name,
      target: r.targetPart.name,
      targetId: r.targetPart.id,
      type: r.relationshipType,
      reason: r.reason,
      confidence: r.confidence,
    })),
    recommendations: recommendations.map((r) => ({
      trigger: r.triggerPart.name,
      recommended: r.recommendedPart.name,
      recommendedId: r.recommendedPart.id,
      type: r.recommendationType,
      reason: r.reason,
      priority: r.priority,
    })),
  };
}

export async function getEngineeringKnowledge(partId?: string, query?: string) {
  return prisma.engineeringKnowledge.findMany({
    where: {
      active: true,
      ...(partId ? { partId } : {}),
      ...(query ? { content: { contains: query, mode: "insensitive" } } : {}),
    },
    take: 10,
  });
}

export async function searchManufacturer(name: string) {
  return prisma.manufacturer.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    take: 5,
  });
}

/** Search parts by name/alias and return current prices across grades. */
export async function searchPrices(query: string, limit = 8) {
  const parts = await searchParts(query, limit);
  const out: {
    name: string;
    partId: string;
    prices: { grade: string; price: string }[];
  }[] = [];
  for (const p of parts) {
    const cur = await getCurrentPrice(p.id);
    if (cur) out.push({ name: p.name, partId: p.id, prices: cur.prices.map((x) => ({ grade: x.grade, price: x.price })) });
  }
  return out;
}

/**
 * Format recommendations into the user-friendly block format:
 * ✅ Clutch plate — GH₵45
 * 🔧 Check clutch bearing
 * 🔧 Check pressure plate
 * 🔧 Check clutch cable
 * 💡 Ask whether the customer wants the complete clutch set
 */
export function formatRecommendations(
  recommendations: { trigger: string; recommended: string; recommendedId: string; type: string; reason: string | null; priority: number }[],
  prices: { grade: string; price: string }[] = [],
): string {
  if (recommendations.length === 0) return "";

  const PRIORITY_LABELS: Record<number, string> = {
    1: "✅",
    2: "🔧",
    3: "🔍",
    4: "🔄",
    5: "💡",
    6: "↔️",
    7: "⬆️",
    8: "📦",
  };

  const lines: string[] = [];

  // Add price info if available
  if (prices.length > 0) {
    const priceLine = prices
      .map((p) => `💰 ${p.grade}: GH₵${p.price}`)
      .join(" / ");
    lines.push(priceLine);
  }

  // Add recommendations
  for (const r of recommendations) {
    const label = PRIORITY_LABELS[r.priority] ?? "💡";
    lines.push(`${label} ${r.recommended}`);
  }

  // Add footer note about complete set
  lines.push(
    "💡 Ask whether the customer wants the complete set or individual parts.",
  );

  return lines.join("\n");
}

/** Record a human correction / feedback (controlled mutation). */
export async function recordFeedback(input: {
  feedbackType: string;
  userInput?: string;
  aiResponse?: string;
  correctionText?: string;
  partId?: string;
}) {
  return prisma.humanFeedback.create({
    data: {
      feedbackType: input.feedbackType as never,
      userInput: input.userInput,
      aiResponse: input.aiResponse,
      correctionText: input.correctionText,
      partId: input.partId,
      status: "open",
    },
  });
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No parts found in the database.";
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`- ${r.name}${r.partNumber ? ` (${r.partNumber})` : ""}${r.manufacturer ? ` [${r.manufacturer}]` : ""} — ${formatStock(r.stockQty)}${r.match !== "exact" ? ` (matched by ${r.match})` : ""}`);
    for (const p of r.prices) lines.push(`    ${p.grade}: ${p.currency === "GHS" ? "GH₵" : p.currency + " "}${p.price}`);
  }
  return lines.join("\n");
}
