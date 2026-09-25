import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

export const sql = neon(connectionString);

export type SearchResult = {
  id: string;
  name: string;
  partNumber: string | null;
  category: string | null;
  vehicleSystem: string | null;
  manufacturer: string | null;
  stockQty: number | null;
  prices: { grade: string; price: string; currency: string }[];
  match: 'exact' | 'alias' | 'part_number' | 'contains' | 'fuzzy';
};

export type PartDetail = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  partNumber: string | null;
  vehicleSystem: string | null;
  manufacturerId: string | null;
  manufacturerName: string | null;
  stockQty: number | null;
  prices: PartPrice[];
  aliases: PartAlias[];
  compatibilities: PartCompatibility[];
};

export type PartPrice = {
  id: string;
  partId: string;
  qualityGradeId: string;
  gradeCode: string;
  gradeName: string;
  gradeRank: number;
  price: string;
  currency: string;
  source: string | null;
};

export type PartAlias = {
  id: string;
  partId: string;
  alias: string;
  language: string;
  source: string | null;
  confidence: number | null;
};

export type PartCompatibility = {
  id: string;
  partId: string;
  vehicleId: string;
  vehicleManufacturer: string;
  vehicleModel: string;
  status: string;
  notes: string | null;
  confidence: number | null;
};

export type Vehicle = {
  id: string;
  manufacturer: string;
  model: string;
  generation: string | null;
  engine: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  notes: string | null;
};

export type Manufacturer = {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  notes: string | null;
};

export type EngineeringKnowledge = {
  id: string;
  partId: string | null;
  vehicleId: string | null;
  title: string;
  content: string;
  kind: string;
  source: string | null;
};

export type Recommendation = {
  id: string;
  triggerPartId: string;
  recommendedPartId: string;
  triggerPartName: string;
  recommendedPartName: string;
  type: string;
  reason: string | null;
  priority: number;
};

export type HumanFeedback = {
  id: string;
  conversationId: string | null;
  partId: string | null;
  feedbackType: string;
  userInput: string | null;
  aiResponse: string | null;
  correctionText: string | null;
  status: string;
  createdBy: string | null;
  createdAt: Date;
};

export function formatStock(qty: number | null): string {
  if (qty === null || qty === undefined) return 'stock level unknown — we will confirm availability';
  if (qty <= 0) return 'out of stock';
  if (qty <= 5) return `low stock (${qty} left)`;
  return 'in stock';
}

function fmtPrice(p: { price: string | number }): string {
  return Number(p.price.toString()).toLocaleString(undefined, { minimumFractionDigits: 0 });
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No parts found in the database.";
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`- id=${r.id} ${r.name}${r.partNumber ? ` (${r.partNumber})` : ""}${r.manufacturer ? ` [${r.manufacturer}]` : ""} — ${formatStock(r.stockQty)}${r.match !== "exact" ? ` (matched by ${r.match})` : ""}`);
    for (const p of r.prices) lines.push(`    ${p.grade}: ${p.currency === "GHS" ? "GH₵" : p.currency + " "}${p.price}`);
  }
  return lines.join("\n");
}

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

  if (prices.length > 0) {
    const priceLine = prices
      .map((p) => `💰 ${p.grade}: GH₵${p.price}`)
      .join(" / ");
    lines.push(priceLine);
  }

  for (const r of recommendations) {
    const label = PRIORITY_LABELS[r.priority] ?? "💡";
    lines.push(`${label} ${r.recommended} (id=${r.recommendedId})`);
  }

  lines.push(
    "💡 Ask whether the customer wants the complete set or individual parts.",
  );

  return lines.join("\n");
}