import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "../components/page-header";
import { DeleteButton } from "../components/delete-button";
import { deletePart } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil } from "lucide-react";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const query = q?.trim() ?? "";
  const cat = category?.trim() ?? "";

  const categories = await prisma.part.findMany({ distinct: ["category"], select: { category: true } });

  const where = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { partNumber: { contains: query, mode: "insensitive" as const } },
            { aliases: { some: { alias: { contains: query, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(cat ? { category: cat } : {}),
  };

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { name: "asc" },
      take: 200,
      include: {
        manufacturer: { select: { name: true } },
        prices: { where: { active: true }, include: { qualityGrade: true }, orderBy: { qualityGrade: { rank: "asc" } } },
        aliases: { take: 3 },
      },
    }),
    prisma.part.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Parts"
        description={`${total.toLocaleString()} parts in the knowledge base.`}
        action={
          <Button asChild>
            <Link href="/admin/parts/new">
              <Plus className="mr-1 h-4 w-4" /> New part
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex gap-2" method="get">
        <Input name="q" defaultValue={query} placeholder="Search name, part number or alias…" className="max-w-sm" />
        <select name="category" defaultValue={cat} className="max-w-[200px] rounded-md border bg-background px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => c.category && <option key={c.category}>{c.category}</option>)}
        </select>
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Part #</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">System</th>
              <th className="p-3 font-medium">Prices</th>
              <th className="p-3 font-medium">Aliases</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{p.name}</div>
                  {!p.active && <Badge variant="secondary">inactive</Badge>}
                </td>
                <td className="p-3 text-muted-foreground">{p.partNumber ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.category ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.vehicleSystem ?? "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {p.prices.length === 0 && <span className="text-muted-foreground">—</span>}
                    {p.prices.map((pr) => (
                      <Badge key={pr.id} variant="outline">
                        {pr.qualityGrade.name}: GH₵{Number(pr.price.toString())}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{p.aliases.map((a) => a.alias).join(", ") || "—"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Link href={`/admin/parts/${p.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteButton action={deletePart} id={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
