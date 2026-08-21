/**
 * Import Bajaj + TVS price lists (Excel) into the DEGOONY catalog.
 *
 * Non-destructive and idempotent:
 * - Parts are matched by normalized name and created only if missing.
 * - For each (part, grade) the previous active price is deactivated
 *   (history kept) and the new price becomes active.
 * - Conversations, feedback, quotations are never touched.
 * - Batch-based: catalog is loaded into memory once, writes use createMany.
 *
 * Usage: npx tsx scripts/import-prices.mts
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as fs from "node:fs";
import * as path from "node:path";

import type { WorkSheet } from "xlsx";
import * as XLSXModule from "xlsx";

const XLSX = (XLSXModule as unknown as { default: typeof import("xlsx") }).default;

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const PRICE_DIR = path.join(process.cwd(), "price_lookup");

type RawItem = {
  name: string;
  brand: string;
  grade: string;
  price: number;
  qty: number | null;
  category: string;
  source: string;
  partNumber?: string;
  vehicle?: "BAJAJ" | "TVS";
};

const GRADE_MAP: Record<string, string> = {
  "bajaj original": "PINK",
  "tvs original": "PINK",
  original: "PINK",
  endurance: "ENDURANCE",
  forta: "FORTA",
  forte: "FORTA",
  vorrac: "GENERIC",
  flash: "GENERIC",
  luminaz: "GENERIC",
  lum: "GENERIC",
};

function norm(s: unknown): string {
  if (s == null) return "";
  return String(s).replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseSimpleSheet(ws: WorkSheet): RawItem[] {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
  const items: RawItem[] = [];
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cells = [...r, null, null, null, null, null];
    const joined = cells.slice(0, 4).map((c) => norm(c).toUpperCase()).join("|");
    if (joined.includes("DESCRIPTION") && joined.includes("BRAND") && joined.includes("PRICE")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error("Could not find DESCRIPTION/BRAND/PRICE header row");
  for (const r of rows.slice(headerIdx + 1)) {
    const cells = [...r, null, null, null, null, null];
    const desc = norm(cells[0]);
    const brand = norm(cells[1]);
    const price = Number(cells[2]);
    if (!desc || desc.toUpperCase() === "TOTAL" || !isFinite(price) || price <= 0) continue;
    items.push({
      name: desc,
      brand,
      grade: GRADE_MAP[brand.toLowerCase()] ?? "GENERIC",
      price,
      qty: typeof cells[3] === "number" && cells[3] ? Number(cells[3]) : null,
      category: "General",
      source: "EVER GREEN PRICE LIST 19.08.26",
    });
  }
  return items;
}

function parseTvsOfficialSheet(ws: WorkSheet): RawItem[] {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
  const items: RawItem[] = [];
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cells = [...r, null, null, null, null, null, null];
    const joined = cells.slice(0, 6).map((c) => norm(c).toUpperCase()).join("|");
    if (joined.includes("PARTS CODE") && joined.includes("ITEM") && joined.includes("PRICE")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error("Could not find Parts Code/Item header row");
  for (const r of rows.slice(headerIdx + 1)) {
    const cells = [...r, null, null, null, null, null, null];
    const code = norm(cells[0]);
    const item = norm(cells[1]);
    const dealer = Number(cells[2]);
    const pgm = Number(cells[3]);
    const retail = Number(cells[4]);
    const category = norm(cells[5]) || "Parts";
    const price = isFinite(retail) && retail > 0 ? retail : isFinite(pgm) && pgm > 0 ? pgm : dealer;
    if (!item || !isFinite(price) || price <= 0) continue;
    items.push({
      name: item,
      brand: "TVS",
      grade: "PINK",
      price,
      qty: null,
      category,
      source: "TVS OFFICIAL PRICE LIST",
      partNumber: code || undefined,
      vehicle: "TVS",
    });
  }
  return items;
}

async function main() {
  const bajajPath = path.join(PRICE_DIR, "BAJAJ001.xlsx");
  const tvsPath = path.join(PRICE_DIR, "TVS001.xlsx");
  if (!fs.existsSync(bajajPath) || !fs.existsSync(tvsPath)) {
    throw new Error(`Missing price list files in ${PRICE_DIR}`);
  }

  const bajajWb = XLSX.readFile(bajajPath);
  const tvsWb = XLSX.readFile(tvsPath);

  const bajajItems = parseSimpleSheet(bajajWb.Sheets[bajajWb.SheetNames[0]]).map((i) => ({
    ...i,
    vehicle: "BAJAJ" as const,
    source: "BAJAJ PRICE LIST 19.08.26",
  }));
  const tvsOfficial = parseTvsOfficialSheet(tvsWb.Sheets[tvsWb.SheetNames[0]]);
  const tvsGoods = parseSimpleSheet(tvsWb.Sheets[tvsWb.SheetNames[1]]).map((i) => ({
    ...i,
    vehicle: "TVS" as const,
    source: "EVER GREEN TVS GOODS 19.08.26",
  }));

  const all = [...bajajItems, ...tvsOfficial, ...tvsGoods];
  console.log("Parsed items:", {
    bajaj: bajajItems.length,
    tvsOfficial: tvsOfficial.length,
    tvsGoods: tvsGoods.length,
    total: all.length,
  });

  // --- Load catalog into memory ---------------------------------------------
  const [manufacturers, vehicles, grades, parts, aliases, prices, compats] = await Promise.all([
    prisma.manufacturer.findMany(),
    prisma.vehicle.findMany(),
    prisma.qualityGrade.findMany(),
    prisma.part.findMany({ where: { active: true } }),
    prisma.partAlias.findMany(),
    prisma.partPrice.findMany({ where: { active: true, effectiveTo: null } }),
    prisma.partCompatibility.findMany(),
  ]);

  const mfByName = new Map(manufacturers.map((m) => [m.name.toLowerCase(), m.id]));
  const vKey = (m: string, mo: string) => `${m.toLowerCase()}|${mo.toLowerCase()}`;
  const vehicleByKey = new Map(vehicles.map((v) => [vKey(v.manufacturer, v.model), v]));
  const gradeByCode = new Map(grades.map((g) => [g.code.toLowerCase(), g.id]));
  const gradeByName = new Map(grades.map((g) => [g.name.toLowerCase(), g.id]));
  const partByNorm = new Map(parts.map((p) => [normalizeName(p.name), p]));
  const aliasExists = new Set(aliases.map((a) => `${a.partId}|${a.alias.toLowerCase()}`));
  const priceKey = (pid: string, gid: string) => `${pid}|${gid}`;
  const activePriceByKey = new Map(prices.map((p) => [priceKey(p.partId, p.qualityGradeId), p]));
  const compatExists = new Set(compats.map((c) => `${c.partId}|${c.vehicleId}`));

  const gradeId = (code: string) => {
    const id = gradeByCode.get(code.toLowerCase()) ?? gradeByName.get(code.toLowerCase());
    if (!id) throw new Error(`Unknown quality grade: ${code}`);
    return id;
  };

  // --- Ensure manufacturers / vehicles --------------------------------------
  const getManufacturerId = async (name: string, country: string) => {
    const key = name.toLowerCase();
    if (mfByName.has(key)) return mfByName.get(key)!;
    const m = await prisma.manufacturer.create({ data: { name, country } });
    mfByName.set(key, m.id);
    return m.id;
  };
  const bajajId = await getManufacturerId("Bajaj", "India");
  const tvsId = await getManufacturerId("TVS", "India");

  const getVehicle = async (manufacturer: string, model: string, notes: string) => {
    const key = vKey(manufacturer, model);
    if (vehicleByKey.has(key)) return vehicleByKey.get(key)!;
    const v = await prisma.vehicle.create({ data: { manufacturer, model, notes } });
    vehicleByKey.set(key, v);
    return v;
  };
  const vBajajRE = await getVehicle("Bajaj", "RE (Auto Rickshaw)", "Classic Bajaj RE tuk-tuk.");
  const vBajajBS4 = await getVehicle("Bajaj", "RE BS4", "BS4 emission variant.");
  const vBajajBS6 = await getVehicle("Bajaj", "RE BS6", "BS6 emission variant.");
  const vTVS3W = await getVehicle("TVS", "3-Wheeler (King/Metro)", "TVS three-wheeler tuk-tuk range.");

  // --- Build write batches ----------------------------------------------------
  const newParts: Prisma.PartCreateManyInput[] = [];
  const newAliases: Prisma.PartAliasCreateManyInput[] = [];
  const newPrices: Prisma.PartPriceCreateManyInput[] = [];
  const deactivateIds: string[] = [];
  const newCompats: Prisma.PartCompatibilityCreateManyInput[] = [];
  const partNormToId = new Map<string, string>();
  const seenItems = new Set<string>();

  for (const it of all) {
    const key = normalizeName(it.name);
    if (!key) continue;
    const itemKey = `${key}|${it.brand.toLowerCase()}|${it.grade}`;
    if (seenItems.has(itemKey)) continue;
    seenItems.add(itemKey);

    let part = partByNorm.get(key);
    if (!part) {
      const pending = newParts.find((p) => normalizeName(p.name) === key);
      if (!pending) {
        const np = {
          name: it.name,
          category: it.category,
          partNumber: it.partNumber,
          manufacturerId: it.vehicle === "TVS" ? tvsId : bajajId,
          active: true,
        };
        newParts.push(np);
        partNormToId.set(key, `pending-${newParts.length - 1}`);
      }
    } else {
      partNormToId.set(key, part.id);
    }

    // Alias (normalized name) for lookup
    const pid = part?.id ?? partNormToId.get(key)!;
    if (pid.startsWith("pending-")) {
      // alias will be created after parts are inserted
      newAliases.push({ partId: pid, alias: key, language: "en", source: it.source, confidence: 0.9 });
    } else if (!aliasExists.has(`${pid}|${key}`)) {
      newAliases.push({ partId: pid, alias: key, language: "en", source: it.source, confidence: 0.9 });
      aliasExists.add(`${pid}|${key}`);
    }

    // Price per grade
    const gid = gradeId(it.grade);
    const pk = priceKey(pid, gid);
    const prev = activePriceByKey.get(pk);
    const newPriceStr = it.price.toFixed(2);
    if (prev && prev.price.toString() !== newPriceStr) {
      deactivateIds.push(prev.id);
    }
    if (!prev || prev.price.toString() !== newPriceStr) {
      newPrices.push({
        partId: pid,
        qualityGradeId: gid,
        price: new Prisma.Decimal(newPriceStr),
        currency: "GHS",
        active: true,
        source: it.source,
        notes: it.brand ? `Brand: ${it.brand}` : undefined,
      });
    }

    // Compatibility
    const vehicles = it.vehicle === "TVS" ? [vTVS3W] : [vBajajRE, vBajajBS4, vBajajBS6];
    for (const v of vehicles) {
      const ck = `${pid}|${v.id}`;
      if (compatExists.has(ck)) continue;
      compatExists.add(ck);
      newCompats.push({ partId: pid, vehicleId: v.id, status: "COMPATIBLE", source: it.source, confidence: 0.95 });
    }
  }

  // --- Execute in batch -------------------------------------------------------
  const createdParts = await prisma.part.createMany({ data: newParts, skipDuplicates: true });
  if (newParts.length > 0) {
    const fresh = await prisma.part.findMany({
      where: { name: { in: newParts.map((p) => p.name) } },
      select: { id: true, name: true },
    });
    const idByNorm = new Map(fresh.map((p) => [normalizeName(p.name), p.id]));
    for (const p of newParts) {
      const realId = idByNorm.get(normalizeName(p.name));
      if (realId) partNormToId.set(normalizeName(p.name), realId);
    }
    // Resolve pending ids in aliases / prices / compats
    for (const a of newAliases) if (a.partId.startsWith("pending-")) a.partId = partNormToId.get(a.alias)!;
    for (const p of newPrices) if (p.partId.startsWith("pending-")) {
      const idx = Number(p.partId.slice(8));
      p.partId = partNormToId.get(normalizeName(newParts[idx].name))!;
    }
    for (const c of newCompats) if (c.partId.startsWith("pending-")) {
      const idx = Number(c.partId.slice(8));
      c.partId = partNormToId.get(normalizeName(newParts[idx].name))!;
    }
  }
  const createdAliases = await prisma.partAlias.createMany({ data: newAliases, skipDuplicates: true });
  const deactivatedPrices = deactivateIds.length > 0
    ? await prisma.partPrice.updateMany({ where: { id: { in: deactivateIds } }, data: { active: false, effectiveTo: new Date() } })
    : { count: 0 };
  const createdPrices = await prisma.partPrice.createMany({ data: newPrices, skipDuplicates: true });
  const createdCompat = await prisma.partCompatibility.createMany({ data: newCompats, skipDuplicates: true });

  console.log(
    JSON.stringify(
      {
        createdParts: createdParts.count,
        createdAliases: createdAliases.count,
        deactivatedPrices: deactivatedPrices.count,
        createdPrices: createdPrices.count,
        createdCompat: createdCompat.count,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());