import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "../../../components/page-header";
import { PartForm } from "../../../components/part-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "../../../components/delete-button";
import { deletePart } from "../../../actions";

export default async function EditPartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [part, manufacturers] = await Promise.all([
    prisma.part.findUnique({
      where: { id },
      include: {
        aliases: true,
        prices: { where: { active: true }, include: { qualityGrade: true } },
        manufacturer: true,
        compatibilities: { include: { vehicle: true } },
      },
    }),
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!part) notFound();

  return (
    <>
      <PageHeader
        title={part.name}
        description={`Part record ${part.partNumber ? `· ${part.partNumber}` : ""}`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/parts">Back</Link>
            </Button>
            <DeleteButton action={deletePart} id={part.id} label="Delete part" iconOnly={false} />
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <PartForm
            manufacturers={manufacturers}
            initial={{
              id: part.id,
              name: part.name,
              description: part.description,
              category: part.category,
              subcategory: part.subcategory,
              partNumber: part.partNumber,
              vehicleSystem: part.vehicleSystem,
              manufacturerId: part.manufacturerId,
              active: part.active,
              aliases: part.aliases,
            }}
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current prices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {part.prices.length === 0 && <p className="text-muted-foreground text-sm">No active prices. Add one on the Prices page.</p>}
              {part.prices.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <Badge>{pr.qualityGrade.name}</Badge>
                  <span className="font-medium">GH₵{Number(pr.price.toString())}</span>
                  <span className="text-muted-foreground text-xs">{pr.source}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compatibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {part.compatibilities.length === 0 && <p className="text-muted-foreground text-sm">No compatibility records.</p>}
              {part.compatibilities.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    {c.vehicle.manufacturer} {c.vehicle.model}
                  </span>
                  <Badge variant={c.status === "COMPATIBLE" ? "default" : "secondary"}>{c.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
