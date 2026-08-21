import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { addPrice, deactivatePrice } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [grades, parts, prices] = await Promise.all([
    prisma.qualityGrade.findMany({ orderBy: { rank: "asc" } }),
    prisma.part.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.partPrice.findMany({
      where: { active: true, ...(query ? { part: { name: { contains: query, mode: "insensitive" } } } : {}) },
      include: { part: { select: { name: true, id: true } }, qualityGrade: true },
      orderBy: [{ part: { name: "asc" } }, { qualityGrade: { rank: "asc" } }],
      take: 500,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Prices"
        description="Current prices are never silently overwritten — deactivating a price creates history."
      />
      <div className="mb-4">
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Filter by part name…" className="max-w-sm" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add price</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addPrice} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="partId">Part</Label>
                <Select name="partId" required>
                  <SelectTrigger id="partId">
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {parts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualityGradeId">Quality grade</Label>
                <Select name="qualityGradeId" required>
                  <SelectTrigger id="qualityGradeId">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (GH₵)</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" placeholder="e.g. Ever Green Parts Kumasi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="e.g. brand" />
              </div>
              <Button type="submit" className="w-full">
                Add price
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Part</th>
                <th className="p-3 font-medium">Grade</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Updated</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">{p.part.name}</td>
                  <td className="p-3">
                    <Badge>{p.qualityGrade.name}</Badge>
                  </td>
                  <td className="p-3 font-medium">GH₵{Number(p.price.toString())}</td>
                  <td className="p-3 text-muted-foreground">{p.source ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.updatedAt.toLocaleDateString()}</td>
                  <td className="p-3">
                    <DeleteButton action={deactivatePrice} id={p.id} label="Deactivate price" />
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
