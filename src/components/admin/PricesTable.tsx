"use client";

import { useState } from "react";
import { usePrices, useParts, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import useSWR from "swr";

export function PricesTable() {
  const { data, error, isLoading, mutate } = usePrices();
  const { data: partsData } = useParts({ limit: 100 });
  const { data: grades } = useSWR("/api/admin/quality-grades", (url: string) =>
    fetch(url).then((r) => r.json())
  );

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ partId: "", qualityGradeId: "", price: "", source: "admin", notes: "" });
  const [saving, setSaving] = useState(false);

  const prices = data || [];
  const parts = partsData?.parts || [];
  const gradeList = grades || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall("/api/admin/prices", {
        method: "POST",
        body: JSON.stringify({
          partId: form.partId,
          qualityGradeId: form.qualityGradeId,
          price: parseFloat(form.price),
          source: form.source,
          notes: form.notes || null,
        }),
      });
      setForm({ partId: "", qualityGradeId: "", price: "", source: "admin", notes: "" });
      setShowCreate(false);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this price?")) return;
    await apiCall(`/api/admin/prices?id=${id}`, { method: "DELETE" });
    mutate();
  };

  if (error) return <div className="text-red-500">Failed to load prices</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>All Prices</CardTitle>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Add / Update Price</Button>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">Set current price (replaces previous active for same grade)</h4>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.partId} onValueChange={(v) => setForm({ ...form, partId: v })} required>
                <SelectTrigger><SelectValue placeholder="Select part*" /></SelectTrigger>
                <SelectContent>
                  {parts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.part_number ? ` (${p.part_number})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.qualityGradeId} onValueChange={(v) => setForm({ ...form, qualityGradeId: v })} required>
                <SelectTrigger><SelectValue placeholder="Quality grade*" /></SelectTrigger>
                <SelectContent>
                  {gradeList.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name} ({g.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" min="0" placeholder="Price (GH₵)*" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              <Input placeholder="Source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !form.partId || !form.qualityGradeId || !form.price}>
                {saving ? "Saving…" : "Save price"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Price (GH₵)</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : prices.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No prices</TableCell></TableRow>
              ) : (
                prices.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.part_name}</TableCell>
                    <TableCell><Badge variant="secondary">{p.grade_name} ({p.grade_code})</Badge></TableCell>
                    <TableCell>{p.price}</TableCell>
                    <TableCell>{p.currency}</TableCell>
                    <TableCell>{p.source || "-"}</TableCell>
                    <TableCell>{p.effective_from ? new Date(p.effective_from).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{p.effective_to ? new Date(p.effective_to).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
