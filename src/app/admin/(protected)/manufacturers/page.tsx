import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { createManufacturer, deleteManufacturer } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ManufacturersPage() {
  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { parts: true } } },
  });

  return (
    <>
      <PageHeader title="Manufacturers" description="Part manufacturers and local distributors." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add manufacturer</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createManufacturer} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required placeholder="Bajaj" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Add manufacturer
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Country</th>
                <th className="p-3 font-medium">Website</th>
                <th className="p-3 font-medium">Parts</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {manufacturers.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3 text-muted-foreground">{m.country ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{m.website ? <a href={m.website} target="_blank" rel="noreferrer" className="underline">{m.website}</a> : "—"}</td>
                  <td className="p-3 text-muted-foreground">{m._count.parts}</td>
                  <td className="p-3">
                    <DeleteButton action={deleteManufacturer} id={m.id} />
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
