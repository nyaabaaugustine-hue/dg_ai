"use client";

import { useState } from "react";
import { useCompatibilities, useParts, useVehicles, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["COMPATIBLE", "INCOMPATIBLE", "CONDITIONAL", "UNKNOWN"] as const;
type StatusOption = typeof STATUS_OPTIONS[number];

export function CompatibilitiesManager() {
  const [partId, setPartId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState<StatusOption>("UNKNOWN");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data, error, isLoading, mutate } = useCompatibilities(partId || undefined, vehicleId || undefined);
  const { data: partsData } = useParts({ limit: 100 });
  const { data: vehiclesData } = useVehicles();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiCall("/api/admin/compatibilities", { 
      method: "POST", 
      body: JSON.stringify({ partId, vehicleId, status, notes, confidence: 1 }) 
    });
    setPartId(""); setVehicleId(""); setStatus("UNKNOWN"); setNotes("");
    mutate();
  };

  const handleEdit = async (id: string) => {
    const payload = {
      status: editForm.status,
      notes: editForm.notes,
      confidence: editForm.confidence,
      source: editForm.source,
    };
    await apiCall(`/api/admin/compatibilities/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditingId(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this compatibility?")) return;
    await apiCall(`/api/admin/compatibilities/${id}`, { method: "DELETE" });
    mutate();
  };

  const comps = data || [];
  const parts = partsData?.parts || [];
  const vehicles = vehiclesData || [];

  if (error) return <div className="text-red-500">Failed to load compatibilities</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compatibilities</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
          <h4 className="font-medium">Add Compatibility</h4>
          <div className="grid grid-cols-4 gap-2">
            <Select value={partId} onValueChange={setPartId}>
              <SelectTrigger><SelectValue placeholder="Select Part" /></SelectTrigger>
              <SelectContent>
                {parts.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.part_number})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.manufacturer} {v.model}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus as (value: string) => void}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={!partId || !vehicleId}>Add</Button>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : comps.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No compatibilities found</TableCell></TableRow>
              ) : (
                comps.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.part_name}</TableCell>
                    <TableCell>{c.manufacturer} {c.model}</TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Select value={editForm.status ?? c.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className={`badge ${c.status === "COMPATIBLE" ? "bg-green-100 text-green-800" : c.status === "INCOMPATIBLE" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{c.status}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input value={editForm.notes ?? ""} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
                      ) : c.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === c.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEdit(c.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditForm(c); setEditingId(c.id); }}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
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