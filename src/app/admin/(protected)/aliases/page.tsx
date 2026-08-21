import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { createAlias, deleteAlias } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AliasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [parts, aliases] = await Promise.all([
    prisma.part.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 300 }),
    prisma.partAlias.findMany({
      where: query
        ? {
            OR: [
              { alias: { contains: query, mode: "insensitive" } },
              { part: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {},
      include: { part: { select: { name: true } } },
      orderBy: { alias: "asc" },
      take: 300,
    }),
  ]);

  return (
    <>
      <PageHeader title="Aliases" description="Local names, mechanic terminology and slang for parts." />
      <div className="mb-4">
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search alias or part…" className="max-w-sm" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add alias</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAlias} className="space-y-3">
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
                <Label htmlFor="alias">Alias *</Label>
                <Input id="alias" name="alias" required placeholder="carb, reverse wire, shock…" />
              </div>
              <Button type="submit" className="w-full">
                Add alias
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Alias</th>
                <th className="p-3 font-medium">Part</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">
                    <Badge variant="secondary">{a.alias}</Badge>
                  </td>
                  <td className="p-3 font-medium">{a.part.name}</td>
                  <td className="p-3 text-muted-foreground">{a.source ?? "—"}</td>
                  <td className="p-3">
                    <DeleteButton action={deleteAlias} id={a.id} />
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
