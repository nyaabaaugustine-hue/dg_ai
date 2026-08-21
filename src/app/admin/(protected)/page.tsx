import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "./components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const [parts, prices, vehicles, manufacturers, aliases, compatibilities, feedback, conversations] = await Promise.all([
    prisma.part.count(),
    prisma.partPrice.count({ where: { active: true } }),
    prisma.vehicle.count(),
    prisma.manufacturer.count(),
    prisma.partAlias.count(),
    prisma.partCompatibility.count(),
    prisma.humanFeedback.count({ where: { status: "open" } }),
    prisma.conversation.count(),
  ]);

  const recentFeedback = await prisma.humanFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { part: { select: { name: true } } },
  });

  const recentParts = await prisma.part.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { prices: { where: { active: true }, include: { qualityGrade: true } } },
  });

  const stats = [
    { label: "Parts", value: parts, href: "/admin/parts" },
    { label: "Current prices", value: prices, href: "/admin/prices" },
    { label: "Vehicles", value: vehicles, href: "/admin/vehicles" },
    { label: "Aliases", value: aliases, href: "/admin/aliases" },
    { label: "Compatibility records", value: compatibilities, href: "/admin/compatibility" },
    { label: "Manufacturers", value: manufacturers, href: "/admin/manufacturers" },
    { label: "Open feedback", value: feedback, href: "/admin/feedback" },
    { label: "AI conversations", value: conversations, href: "/admin/conversations" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="DEGOONY SALES INTELLIGENCE knowledge base overview." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">{s.value.toLocaleString()}</CardTitle>
                <CardDescription>{s.label}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open feedback</CardTitle>
            <CardDescription>Corrections from staff and customers that should be reviewed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentFeedback.length === 0 && <p className="text-muted-foreground text-sm">No open feedback.</p>}
            {recentFeedback.map((f) => (
              <div key={f.id} className="rounded-lg border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <Badge variant="secondary">{f.feedbackType.replaceAll("_", " ")}</Badge>
                  <span className="text-muted-foreground text-xs">{f.createdAt.toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground">{f.correctionText ?? f.userInput ?? "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recently added parts</CardTitle>
            <CardDescription>Latest additions to the knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentParts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground text-xs">{p.category ?? "Uncategorised"}</div>
                </div>
                <div className="flex gap-1">
                  {p.prices.map((pr) => (
                    <Badge key={pr.id} variant="outline">
                      {pr.qualityGrade.name}: GH₵{Number(pr.price.toString())}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
