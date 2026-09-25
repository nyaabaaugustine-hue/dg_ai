"use client";

import { useState } from "react";
import { useAliases, useParts, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";

export function AliasesList() {
  const [partId, setPartId] = useState("");
  const [alias, setAlias] = useState("");
  const [language, setLanguage] = useState("en");
  const [source, setSource] = useState("");
  const [confidence, setConfidence] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data, error, isLoading, mutate } = useAliases(partId || undefined);
  const { data: partsData } = useParts({ limit: 100 });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiCall("/api/admin/aliases", { method: "POST", body: JSON.stringify({ partId, alias, language, source, confidence }) });
    setAlias(""); setSource(""); setConfidence(1);
    mutate();
  };

  const handleEdit = async (id: string) => {
    const payload = {
      alias: editForm.alias,
      language: editForm.language,
      source: editForm.source,
      confidence: editForm.confidence,
    };
    await apiCall(`/api/admin/aliases/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditingId(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alias?")) return;
    await apiCall(`/api/admin/aliases/${id}`, { method: "DELETE" });
    mutate();
  };

  const aliases = data || [];
  const parts = partsData?.parts || [];

  if (error) return <div className="text-red-500">Failed to load aliases</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Aliases</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
          <h4 className="font-medium">Add Alias</h4>
          <div className="grid grid-cols-5 gap-2">
            <Select value={partId} onValueChange={setPartId}>
              <SelectTrigger><SelectValue placeholder="Select Part" /></SelectTrigger>
              <SelectContent>
                {parts.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.part_number})</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Alias*" value={alias} onChange={e => setAlias(e.target.value)} required />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="tw">Twi</SelectItem>
                <SelectItem value="ga">Ga</SelectItem>
                <SelectItem value="ee">Ewe</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Source" value={source} onChange={e => setSource(e.target.value)} />
            <Input type="number" min="0" max="1" step="0.1" placeholder="Confidence" value={confidence} onChange={e => setConfidence(parseFloat(e.target.value))} className="w-24" />
          </div>
          <Button type="submit" disabled={!partId || !alias}>Add</Button>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : aliases.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No aliases found</TableCell></TableRow>
              ) : (
                aliases.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.part_name}</TableCell>
                    <TableCell>{editingId === a.id ? <Input value={editForm.alias ?? ""} onChange={e => setEditForm({...editForm, alias: e.target.value})} /> : a.alias}</TableCell>
                    <TableCell>{editingId === a.id ? (
                      <Select value={editForm.language ?? a.language} onValueChange={v => setEditForm({...editForm, language: v})}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="tw">Twi</SelectItem>
                          <SelectItem value="ga">Ga</SelectItem>
                          <SelectItem value="ee">Ewe</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : a.language}</TableCell>
                    <TableCell>{editingId === a.id ? <Input value={editForm.source ?? ""} onChange={e => setEditForm({...editForm, source: e.target.value})} /> : a.source || "-"}</TableCell>
                    <TableCell>{editingId === a.id ? <Input type="number" min="0" max="1" step="0.1" value={editForm.confidence ?? a.confidence ?? 1} onChange={e => setEditForm({...editForm, confidence: parseFloat(e.target.value)})} className="w-24" /> : a.confidence}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === a.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEdit(a.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditForm(a); setEditingId(a.id); }}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
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