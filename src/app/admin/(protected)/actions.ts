"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db-prisma";

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

const partSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  category: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  partNumber: z.string().optional().default(""),
  vehicleSystem: z.string().optional().default(""),
  manufacturerId: z.string().optional().default(""),
  stockQty: z.coerce.number().int().min(0).max(1_000_000).nullable(),
  active: z.enum(["on", "off"]).optional().default("on"),
});

function readPartForm(formData: FormData) {
  return partSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory"),
    partNumber: formData.get("partNumber"),
    vehicleSystem: formData.get("vehicleSystem"),
    manufacturerId: formData.get("manufacturerId"),
    stockQty:
      formData.get("stockQty") === "" || formData.get("stockQty") === null
        ? null
        : formData.get("stockQty"),
    active: formData.get("active"),
  });
}

export async function createPart(formData: FormData) {
  const parsed = readPartForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join("; "));

  const data = parsed.data;
  const aliases = String(formData.get("aliases") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.part.create({
    data: {
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      subcategory: data.subcategory || null,
      partNumber: data.partNumber || null,
      vehicleSystem: data.vehicleSystem || null,
      manufacturerId: data.manufacturerId || null,
      stockQty: data.stockQty,
      active: data.active === "on",
      aliases: { create: aliases.map((alias) => ({ alias, language: "en", source: "admin", confidence: 1 })) },
    },
  });
  revalidatePath("/admin/parts");
}

export async function updatePart(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = readPartForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join("; "));
  const data = parsed.data;

  await prisma.part.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      subcategory: data.subcategory || null,
      partNumber: data.partNumber || null,
      vehicleSystem: data.vehicleSystem || null,
      manufacturerId: data.manufacturerId || null,
      stockQty: data.stockQty,
      active: data.active === "on",
    },
  });
  revalidatePath("/admin/parts");
}

export async function deletePart(id: string) {
  await prisma.part.delete({ where: { id } });
  revalidatePath("/admin/parts");
}

export async function togglePartActive(id: string, active: boolean) {
  await prisma.part.update({ where: { id }, data: { active } });
  revalidatePath("/admin/parts");
}

// ---------------------------------------------------------------------------
// Prices — never overwrite silently: deactivate the old current price, add a new one
// ---------------------------------------------------------------------------

export async function addPrice(formData: FormData) {
  const partId = String(formData.get("partId") ?? "");
  const qualityGradeId = String(formData.get("qualityGradeId") ?? "");
  const price = z.coerce.number().positive().parse(formData.get("price"));
  const source = String(formData.get("source") ?? "").trim() || "admin";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.partPrice.updateMany({
      where: { partId, qualityGradeId, active: true },
      data: { active: false, effectiveTo: new Date() },
    });
    await tx.partPrice.create({
      data: { partId, qualityGradeId, price, currency: "GHS", active: true, source, notes },
    });
  });
  revalidatePath("/admin/prices");
  revalidatePath("/admin/parts");
}

export async function deactivatePrice(id: string) {
  await prisma.partPrice.update({
    where: { id },
    data: { active: false, effectiveTo: new Date() },
  });
  revalidatePath("/admin/prices");
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

const vehicleSchema = z.object({
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  generation: z.string().optional().default(""),
  engine: z.string().optional().default(""),
  yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
  notes: z.string().optional().default(""),
});

export async function createVehicle(formData: FormData) {
  const parsed = vehicleSchema.safeParse({
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    generation: formData.get("generation"),
    engine: formData.get("engine"),
    yearFrom: formData.get("yearFrom") || undefined,
    yearTo: formData.get("yearTo") || undefined,
    notes: formData.get("notes"),
  });
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join("; "));
  const d = parsed.data;
  await prisma.vehicle.create({
    data: {
      manufacturer: d.manufacturer,
      model: d.model,
      generation: d.generation || null,
      engine: d.engine || null,
      yearFrom: d.yearFrom ?? null,
      yearTo: d.yearTo ?? null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/admin/vehicles");
}

export async function deleteVehicle(id: string) {
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/admin/vehicles");
}

// ---------------------------------------------------------------------------
// Manufacturers
// ---------------------------------------------------------------------------

export async function createManufacturer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  await prisma.manufacturer.create({
    data: {
      name,
      website: String(formData.get("website") ?? "").trim() || null,
      country: String(formData.get("country") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath("/admin/manufacturers");
}

export async function deleteManufacturer(id: string) {
  await prisma.manufacturer.delete({ where: { id } });
  revalidatePath("/admin/manufacturers");
}

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

export async function createAlias(formData: FormData) {
  const partId = String(formData.get("partId") ?? "");
  const alias = String(formData.get("alias") ?? "").trim();
  if (!partId || !alias) throw new Error("Part and alias are required");
  await prisma.partAlias.create({ data: { partId, alias, language: "en", source: "admin", confidence: 1 } });
  revalidatePath("/admin/aliases");
}

export async function deleteAlias(id: string) {
  await prisma.partAlias.delete({ where: { id } });
  revalidatePath("/admin/aliases");
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export async function createCompatibility(formData: FormData) {
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const partId = String(formData.get("partId") ?? "");
  const status = String(formData.get("status") ?? "UNKNOWN");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!vehicleId || !partId) throw new Error("Vehicle and part are required");
  await prisma.partCompatibility.upsert({
    where: { vehicleId_partId: { vehicleId, partId } },
    create: { vehicleId, partId, status: status as never, notes, source: "admin", confidence: 1 },
    update: { status: status as never, notes },
  });
  revalidatePath("/admin/compatibility");
}

export async function deleteCompatibility(id: string) {
  await prisma.partCompatibility.delete({ where: { id } });
  revalidatePath("/admin/compatibility");
}
