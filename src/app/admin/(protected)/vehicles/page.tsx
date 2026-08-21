import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { createVehicle, deleteVehicle } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
    include: { _count: { select: { compatibilities: true } } },
  });

  return (
    <>
      <PageHeader title="Vehicles" description="Supported vehicles (initially Bajaj and TVS three-wheelers)." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createVehicle} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input id="manufacturer" name="manufacturer" required placeholder="Bajaj" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input id="model" name="model" required placeholder="RE BS6" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="generation">Generation</Label>
                <Input id="generation" name="generation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engine">Engine</Label>
                <Input id="engine" name="engine" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="yearFrom">Year from</Label>
                  <Input id="yearFrom" name="yearFrom" type="number" min="1900" max="2100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearTo">Year to</Label>
                  <Input id="yearTo" name="yearTo" type="number" min="1900" max="2100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Add vehicle
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium">Generation</th>
                <th className="p-3 font-medium">Engine</th>
                <th className="p-3 font-medium">Years</th>
                <th className="p-3 font-medium">Parts</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="p-3 font-medium">
                    {v.manufacturer} {v.model}
                  </td>
                  <td className="p-3 text-muted-foreground">{v.generation ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{v.engine ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {v.yearFrom && v.yearTo ? `${v.yearFrom}–${v.yearTo}` : v.yearFrom ? `from ${v.yearFrom}` : v.yearTo ? `until ${v.yearTo}` : "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{v._count.compatibilities}</Badge>
                  </td>
                  <td className="p-3">
                    <DeleteButton action={deleteVehicle} id={v.id} />
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
