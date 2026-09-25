"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "./components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiCall } from "@/hooks/useAdminApi";

interface DashboardStats {
  parts: number;
  prices: number;
  vehicles: number;
  manufacturers: number;
  aliases: number;
  compatibilities: number;
  feedback: number;
  conversations: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const [recentParts, setRecentParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, feedbackRes, partsRes] = await Promise.all([
          apiCall("/api/admin/parts?limit=1"),
          apiCall("/api/admin/feedback?limit=5"),
          apiCall("/api/admin/parts?limit=5"),
        ]);
        setStats({
          parts: statsRes.total,
          prices: 0,
          vehicles: 0,
          manufacturers: 0,
          aliases: 0,
          compatibilities: 0,
          feedback: feedbackRes.total,
          conversations: 0,
        });
        setRecentFeedback(feedbackRes.feedback || []);
        setRecentParts(partsRes.parts || []);

        try {
          const [pricesRes, vehiclesRes, manuRes, aliasesRes, compatRes, convRes] = await Promise.all([
            apiCall("/api/admin/prices"),
            apiCall("/api/admin/vehicles"),
            apiCall("/api/admin/manufacturers"),
            apiCall("/api/admin/aliases"),
            apiCall("/api/admin/compatibilities"),
            apiCall("/api/admin/conversations?limit=1"),
          ]);
          setStats(prev => prev ? {
            ...prev,
            prices: Array.isArray(pricesRes) ? pricesRes.length : (pricesRes.total || 0),
            vehicles: Array.isArray(vehiclesRes) ? vehiclesRes.length : 0,
            manufacturers: Array.isArray(manuRes) ? manuRes.length : 0,
            aliases: Array.isArray(aliasesRes) ? aliasesRes.length : 0,
            compatibilities: Array.isArray(compatRes) ? compatRes.length : 0,
            conversations: convRes.total || 0,
          } : null);
        } catch {
          // secondary stats are best-effort
        }
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statCards = [
    { label: "Parts", value: stats?.parts || 0, href: "/admin/parts" },
    { label: "Current prices", value: stats?.prices || 0, href: "/admin/prices" },
    { label: "Vehicles", value: stats?.vehicles || 0, href: "/admin/vehicles" },
    { label: "Aliases", value: stats?.aliases || 0, href: "/admin/aliases" },
    { label: "Compatibility records", value: stats?.compatibilities || 0, href: "/admin/compatibility" },
    { label: "Manufacturers", value: stats?.manufacturers || 0, href: "/admin/manufacturers" },
    { label: "Open feedback", value: stats?.feedback || 0, href: "/admin/feedback" },
    { label: "AI conversations", value: stats?.conversations || 0, href: "/admin/conversations" },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="DEGOONY SALES INTELLIGENCE knowledge base overview." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="animate-pulse">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">—</CardTitle>
                <CardDescription>{s.label}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="DEGOONY SALES INTELLIGENCE knowledge base overview." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
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
            {recentFeedback.map((f: any) => (
              <div key={f.id} className="rounded-lg border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <Badge variant="secondary">{f.feedbackType?.replaceAll("_", " ") || f.feedback_type?.replaceAll("_", " ") || "Feedback"}</Badge>
                  <span className="text-muted-foreground text-xs">{new Date(f.createdAt ?? f.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground">{f.correctionText ?? f.correction_text ?? f.userInput ?? f.user_input ?? "—"}</p>
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
            {recentParts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground text-xs">{p.category ?? "Uncategorised"}</div>
                </div>
                <div className="flex gap-1">
                  {(p.prices || []).map((pr: any) => (
                    <Badge key={pr.grade || pr.grade_name} variant="outline">
                      {pr.grade || pr.grade_name}: GH₵{pr.price}
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