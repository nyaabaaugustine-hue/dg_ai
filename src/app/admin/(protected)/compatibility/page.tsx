import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { createCompatibility, deleteCompatibility } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  COMPATIBLE: "default",
  INCOMPATIBLE: "destructive",
  CONDITIONAL: "secondary",
  UNKNOWN: "outline",
};

export default async function CompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [vehicles, parts, records] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: [{ manufacturer: "asc" }, { model: "asc" }] }),
    prisma.part.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.partCompatibility.findMany({
      where: query
        ? { OR: [{ part: { name: { contains: query, mode: "insensitive" } } }, { vehicle: { model: { contains: query, mode: "insensitive" } } }] }
        : {},
      include: { part: { select: { name: true } }, vehicle: { select: { manufacturer: true, model: true } } },
      orderBy: { updatedAt: "desc" },
      take: 400,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Compatibility"
        description="Vehicle ↔ part compatibility. The AI never assumes compatibility without a record."
      />
      <div className="mb-4">
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search part or vehicle…" className="max-w-sm" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add compatibility</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCompatibility} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle</Label>
                <select name="vehicleId" id="vehicleId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.manufacturer} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partId">Part</Label>
                <select name="partId" id="partId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select name="status" id="status" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="COMPATIBLE">
                  <option value="COMPATIBLE">Compatible</option>
                  <option value="INCOMPATIBLE">Incompatible</option>
                  <option value="CONDITIONAL">Conditional</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="e.g. BS6 only" />
              </div>
              <Button type="submit" className="w-full">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Part</th>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Notes</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.part.name}</td>
                  <td className="p-3">
                    {r.vehicle.manufacturer} {r.vehicle.model}
                  </td>
                  <td className="p-3">
                    <Badge variant={(STATUS_STYLES[r.status] as never) ?? "outline"}>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.notes ?? "—"}</td>
                  <td className="p-3">
                    <DeleteButton action={deleteCompatibility} id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
