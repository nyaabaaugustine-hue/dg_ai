"use client";

import { useState } from "react";
import { useVehicles, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

export function VehiclesList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ manufacturer: "", model: "", generation: "", engine: "", yearFrom: "", yearTo: "", notes: "" });

  const { data, error, isLoading, mutate } = useVehicles();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiCall("/api/admin/vehicles", { method: "POST", body: JSON.stringify({...createForm, yearFrom: parseInt(createForm.yearFrom) || null, yearTo: parseInt(createForm.yearTo) || null}) });
    setShowCreate(false);
    setCreateForm({ manufacturer: "", model: "", generation: "", engine: "", yearFrom: "", yearTo: "", notes: "" });
    mutate();
  };

  const handleEdit = async (id: string) => {
    const payload = {
      manufacturer: editForm.manufacturer,
      model: editForm.model,
      generation: editForm.generation,
      engine: editForm.engine,
      yearFrom: editForm.year_from ? parseInt(editForm.year_from) : null,
      yearTo: editForm.year_to ? parseInt(editForm.year_to) : null,
      notes: editForm.notes,
    };
    await apiCall(`/api/admin/vehicles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditingId(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    await apiCall(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    mutate();
  };

  const vehicles = data || [];

  if (error) return <div className="text-red-500">Failed to load vehicles</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicles</CardTitle>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Add Vehicle</Button>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">Create New Vehicle</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Manufacturer*" value={createForm.manufacturer} onChange={e => setCreateForm({...createForm, manufacturer: e.target.value})} required />
              <Input placeholder="Model*" value={createForm.model} onChange={e => setCreateForm({...createForm, model: e.target.value})} required />
              <Input placeholder="Generation" value={createForm.generation} onChange={e => setCreateForm({...createForm, generation: e.target.value})} />
              <Input placeholder="Engine" value={createForm.engine} onChange={e => setCreateForm({...createForm, engine: e.target.value})} />
              <Input type="number" placeholder="Year From" value={createForm.yearFrom} onChange={e => setCreateForm({...createForm, yearFrom: e.target.value})} />
              <Input type="number" placeholder="Year To" value={createForm.yearTo} onChange={e => setCreateForm({...createForm, yearTo: e.target.value})} />
              <Input placeholder="Notes" value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} className="col-span-2" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Generation</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Years</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No vehicles found</TableCell></TableRow>
              ) : (
                vehicles.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>{editingId === v.id ? <Input value={editForm.manufacturer || v.manufacturer} onChange={e => setEditForm({...editForm, manufacturer: e.target.value})} /> : v.manufacturer}</TableCell>
                    <TableCell>{editingId === v.id ? <Input value={editForm.model || v.model} onChange={e => setEditForm({...editForm, model: e.target.value})} /> : v.model}</TableCell>
                    <TableCell>{editingId === v.id ? <Input value={editForm.generation ?? ""} onChange={e => setEditForm({...editForm, generation: e.target.value})} /> : v.generation || "-"}</TableCell>
                    <TableCell>{editingId === v.id ? <Input value={editForm.engine ?? ""} onChange={e => setEditForm({...editForm, engine: e.target.value})} /> : v.engine || "-"}</TableCell>
                    <TableCell>
                      {editingId === v.id ? (
                        <div className="flex gap-1">
                          <Input type="number" value={editForm.year_from ?? ""} onChange={e => setEditForm({...editForm, year_from: e.target.value})} className="w-20" />
                          <Input type="number" value={editForm.year_to ?? ""} onChange={e => setEditForm({...editForm, year_to: e.target.value})} className="w-20" />
                        </div>
                      ) : (
                        `${v.year_from || "-"} - ${v.year_to || "-"}`
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === v.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEdit(v.id)}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditForm(v); setEditingId(v.id); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(v.id)}><Trash2 className="h-3 w-3" /></Button>
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