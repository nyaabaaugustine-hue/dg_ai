import "dotenv/config";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as fs from "node:fs";
import * as path from "node:path";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

type PriceItem = {
  name: string;
  brand: string;
  grade: string;
  price: number;
  qty: number | null;
  category: string;
  source: string;
  part_number?: string;
  vehicle?: string;
};

const GRADE_NAMES: Record<string, { name: string; rank: number; description: string }> = {
  PINK: { name: "Pink", rank: 1, description: "Topmost quality category." },
  YELLOW: { name: "Yellow", rank: 2, description: "Second/lower quality category." },
  ENDURANCE: { name: "Forte/Endurance", rank: 3, description: "Third/final quality category." },
  FORTA: { name: "Forta", rank: 4, description: "Aftermarket budget quality." },
  GENERIC: { name: "Generic", rank: 5, description: "Other / unbranded." },
};

// Curated alias rules: substring of normalized part name -> extra aliases (local / mechanic / slang).
const ALIAS_RULES: [RegExp, string[]][] = [
  [/carb/, ["carb", "carburettor", "fuel mixer", "fuel bowl"]],
  [/clutch disk|clutch plate|clutch complete|clutch housing|center cluth|centre clutch|hub clutch/, ["clutch plate", "clutch"]],
  [/brake shoe|brake port|brake pot/, ["brake shoe", "brake pads"]],
  [/absorber/, ["shock absorber", "shock", "damper"]],
  [/axle/, ["shaft", "axle shaft"]],
  [/reverse cable|reverse gear/, ["reverse wire", "reverse cable"]],
  [/spark plug/, ["spark plug", "plug", "candle"]],
  [/valve seal/, ["valve stem seal"]],
  [/cam chain|timing chain/, ["cam chain", "timing chain"]],
  [/rotor/, ["rotor", "generator rotor"]],
  [/starter/, ["starter motor", "self starter"]],
  [/fan/, ["cooling fan"]],
  [/head lamp|head light|headlamp/, ["headlight", "head lamp"]],
  [/neck bearing|basket bearing/, ["neck bearing", "head bearing"]],
  [/oil seal/, ["oil seal"]],
  [/gasket/, ["gasket set"]],
  [/mud flap|mudguard/, ["mud flap", "mudguard"]],
  [/silencer/, ["silencer", "muffler", "exhaust"]],
  [/bumper/, ["bumper"]],
  [/windscreen|wind shield/, ["windscreen", "windshield"]],
  [/pivot pin|pivot kit/, ["pivot pin"]],
  [/sprocket/, ["sprocket", "chain sprocket"]],
  [/crank shaft|crankshaft/, ["crankshaft", "crank shaft"]],
  [/flywheel|rotor/, ["flywheel"]],
  [/engine block/, ["engine block", "cylinder block"]],
  [/cylinder head/, ["cylinder head"]],
  [/indicator/, ["indicator", "signal lamp"]],
  [/horn/, ["horn"]],
  [/ignition|lock set/, ["ignition switch", "lock set"]],
  [/mirror/, ["mirror", "side mirror"]],
  [/tyre|tire/, ["tyre", "tire"]],
  [/cable/, ["cable", "bowden cable"]],
];

const SYSTEM_RULES: [RegExp, string][] = [
  [/clutch/, "Clutch"],
  [/brake/, "Brake"],
  [/carb|fuel|gasket full|engine valve|oil pump|piston|ring|valve/, "Engine"],
  [/absorber|suspension|axle|spring/, "Suspension"],
  [/electrical|rotor|stator|horn|headlamp|head light|head lamp|indicator|cdi|charger|rectifier|starter|spark|fuse|relay|battery/, "Electrical"],
  [/tyre|tire|wheel|hub|rim/, "Wheels & Tyres"],
  [/body|bumper|cowling|fender|mud|windscreen|windshield|floor|seat|mirror/, "Body"],
  [/cable|gear/, "Transmission"],
  [/silencer|exhaust/, "Exhaust"],
  [/oil filter|oil seal|gasket/, "Engine"],
  [/bellow|rubber|bushing/, "Rubber & Mountings"],
];

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function makeAliases(name: string): string[] {
  const n = normalizeName(name);
  const aliases = new Set<string>();
  for (const [re, extras] of ALIAS_RULES) {
    if (re.test(n)) extras.forEach((a) => aliases.add(a));
  }
  if (n.length > 2) aliases.add(n);
  return [...aliases];
}

function guessSystem(name: string): string | null {
  const n = normalizeName(name);
  for (const [re, sys] of SYSTEM_RULES) {
    if (re.test(n)) return sys;
  }
  return null;
}

function cleanPartName(name: string): string {
  // Drop the TVS/Bjj suffix noise but keep readable.
  return name.trim();
}

async function main() {
  const dataPath = path.join(__dirname, "..", "prisma", "seed-data", "price_items.json");
  const items: PriceItem[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // --- Reset (idempotent) -------------------------------------------------
  await prisma.$transaction([
    prisma.humanFeedback.deleteMany(),
    prisma.conversationMessage.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.knowledgeChunk.deleteMany(),
    prisma.document.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.engineeringKnowledge.deleteMany(),
    prisma.partRelationship.deleteMany(),
    prisma.partCompatibility.deleteMany(),
    prisma.partPrice.deleteMany(),
    prisma.partAlias.deleteMany(),
    prisma.part.deleteMany(),
    prisma.qualityGrade.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.manufacturer.deleteMany(),
  ]);

  // --- Manufacturers ------------------------------------------------------
  const [bajaj, tvs, evergreen] = await Promise.all([
    prisma.manufacturer.create({ data: { name: "Bajaj", country: "India" } }),
    prisma.manufacturer.create({ data: { name: "TVS", country: "India" } }),
    prisma.manufacturer.create({ data: { name: "Ever Green Parts Kumasi", country: "Ghana", notes: "Local distributor price list source." } }),
  ]);

  // --- Quality grades ------------------------------------------------------
  const gradeIds: Record<string, string> = {};
  for (const [code, meta] of Object.entries(GRADE_NAMES)) {
    const g = await prisma.qualityGrade.create({
      data: { code, name: meta.name, rank: meta.rank, description: meta.description },
    });
    gradeIds[code] = g.id;
  }

  // --- Vehicles -----------------------------------------------------------
  const vBajajRE = await prisma.vehicle.create({
    data: { manufacturer: "Bajaj", model: "RE (Auto Rickshaw)", notes: "Classic Bajaj RE tuk-tuk." },
  });
  const vBajajREBS4 = await prisma.vehicle.create({
    data: { manufacturer: "Bajaj", model: "RE BS4", notes: "BS4 emission variant." },
  });
  const vBajajREBS6 = await prisma.vehicle.create({
    data: { manufacturer: "Bajaj", model: "RE BS6", notes: "BS6 emission variant." },
  });
  const vTVS3W = await prisma.vehicle.create({
    data: { manufacturer: "TVS", model: "3-Wheeler (King/Metro)", notes: "TVS three-wheeler tuk-tuk range." },
  });

  // --- Parts, aliases, prices, compatibility ------------------------------
  const seenPart = new Map<string, string>();
  const compatSeen = new Set<string>();
  let partCount = 0;
  let priceCount = 0;
  let aliasCount = 0;
  let compatCount = 0;

  for (const it of items) {
    const name = cleanPartName(it.name);
    const key = normalizeName(name) + "|" + (it.vehicle ?? it.category);
    let partId = seenPart.get(key);
    if (!partId) {
      const part = await prisma.part.create({
        data: {
          name,
          category: it.category,
          subcategory: it.vehicle ?? undefined,
          partNumber: it.part_number || undefined,
          vehicleSystem: guessSystem(name),
          manufacturerId: name.toLowerCase().includes("tvs") ? tvs.id : name.toLowerCase().includes("bajaj") || it.category === "Bajaj Goods" ? bajaj.id : evergreen.id,
          active: true,
        },
      });
      partId = part.id;
      seenPart.set(key, partId);
      partCount += 1;

      for (const alias of makeAliases(name)) {
        await prisma.partAlias.create({
          data: { partId, alias, language: "en", source: it.source, confidence: 0.9 },
        });
        aliasCount += 1;
      }
    }

    await prisma.partPrice.create({
      data: {
        partId,
        qualityGradeId: gradeIds[it.grade] ?? gradeIds.GENERIC,
        price: new Prisma.Decimal(it.price.toFixed(2)),
        currency: "GHS",
        active: true,
        source: it.source,
        notes: it.brand ? `Brand: ${it.brand}` : undefined,
      },
    });
    priceCount += 1;

    // Compatibility: Bajaj items -> Bajaj RE vehicles; TVS items -> TVS 3-wheeler.
    const vehicles = it.vehicle === "TVS 3-Wheeler" ? [vTVS3W] : [vBajajRE, vBajajREBS4, vBajajREBS6];
    for (const v of vehicles) {
      const compatKey = `${partId}|${v.id}`;
      if (compatSeen.has(compatKey)) continue;
      compatSeen.add(compatKey);
      await prisma.partCompatibility.create({
        data: { vehicleId: v.id, partId, status: "COMPATIBLE", source: it.source, confidence: 0.95 },
      });
      compatCount += 1;
    }
  }

  // --- Demo relationships + engineering knowledge + recommendations ------
  const findPart = async (re: RegExp) => {
    const parts = await prisma.part.findMany({ where: { name: { contains: "" } } });
    return parts.find((p) => re.test(normalizeName(p.name)));
  };

  const clutchDisk = await findPart(/clutch disk/);
  const clutchCable = await findPart(/clutch cable/);
  const brakeShoe = await findPart(/brake shoe/);
  const carburettor = await findPart(/carburettor/);
  const airFilter = await findPart(/air filter|oil filter/);
  const frontAbsorber = await findPart(/front absorber|absorber front/);
  const centerClutch = await findPart(/center cluth|centre clutch|center clutch/);

  const rel = (srcId: string | undefined, tgtId: string | undefined, relationshipType: string, reason: string) => {
    if (!srcId || !tgtId) return undefined;
    return prisma.partRelationship.create({
      data: { sourcePartId: srcId, targetPartId: tgtId, relationshipType: relationshipType as never, reason, confidence: 0.95, source: "seed" },
    });
  };

  const ops: (Promise<unknown> | undefined)[] = [];
  ops.push(rel(clutchDisk?.id, centerClutch?.id, "COMPLEMENTARY", "Works together in the clutch assembly."));
  ops.push(rel(clutchDisk?.id, clutchCable?.id, "COMMONLY_REPLACED_WITH", "Worn clutch cables are frequently replaced during clutch service."));
  ops.push(rel(brakeShoe?.id, undefined, "INSPECT", "Brake drum wear should be inspected when replacing shoes."));
  ops.push(rel(carburettor?.id, airFilter?.id, "INSPECT", "A clogged air filter affects carburetor tuning."));
  ops.push(rel(frontAbsorber?.id, undefined, "PREVENTIVE", "Check bushings and mountings when replacing the front shock."));

  if (clutchDisk) {
    ops.push(
      prisma.engineeringKnowledge.create({
        data: {
          partId: clutchDisk.id,
          title: "Clutch plate replacement",
          content: "When the clutch is opened, clutch bearing and pressure plate are commonly inspected at the same time so the system does not need to be reopened if another worn component is discovered.",
          kind: "INSTALLATION_NOTES",
          source: "seed",
        },
      }),
      prisma.recommendation.create({
        data: {
          triggerPartId: clutchDisk.id,
          recommendedPartId: centerClutch?.id ?? clutchDisk.id,
          recommendationType: "INSPECT",
          reason: "Commonly inspected when the clutch is opened.",
          priority: 1,
          confidence: 0.9,
        },
      }),
      prisma.recommendation.create({
        data: {
          triggerPartId: clutchDisk.id,
          recommendedPartId: clutchCable?.id ?? clutchDisk.id,
          recommendationType: "INSPECT",
          reason: "Worn clutch cables are often found during clutch service.",
          priority: 2,
          confidence: 0.8,
        },
      }),
    );
  }
  if (brakeShoe) {
    ops.push(
      prisma.recommendation.create({
        data: {
          triggerPartId: brakeShoe.id,
          recommendedPartId: brakeShoe.id,
          recommendationType: "INSPECT",
          reason: "Brake drum should be inspected when replacing brake shoes.",
          priority: 1,
          confidence: 0.9,
        },
      }),
    );
  }

  await Promise.all(ops);

  console.log(
    JSON.stringify(
      {
        parts: partCount,
        prices: priceCount,
        aliases: aliasCount,
        compatibilities: compatCount,
        gradeCount: Object.keys(gradeIds).length,
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
