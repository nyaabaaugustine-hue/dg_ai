"use client";

import { useState } from "react";
import { useManufacturers, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

export function ManufacturersList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", website: "", country: "", notes: "" });

  const { data, error, isLoading, mutate } = useManufacturers();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiCall("/api/admin/manufacturers", { method: "POST", body: JSON.stringify(createForm) });
    setShowCreate(false);
    setCreateForm({ name: "", website: "", country: "", notes: "" });
    mutate();
  };

  const handleEdit = async (id: string) => {
    const payload = {
      name: editForm.name,
      website: editForm.website,
      country: editForm.country,
      notes: editForm.notes,
    };
    await apiCall(`/api/admin/manufacturers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditingId(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this manufacturer?")) return;
    await apiCall(`/api/admin/manufacturers/${id}`, { method: "DELETE" });
    mutate();
  };

  const manufacturers = data || [];

  if (error) return <div className="text-red-500">Failed to load manufacturers</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manufacturers</CardTitle>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Add Manufacturer</Button>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">Create New Manufacturer</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name*" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} required />
              <Input placeholder="Website" value={createForm.website} onChange={e => setCreateForm({...createForm, website: e.target.value})} />
              <Input placeholder="Country" value={createForm.country} onChange={e => setCreateForm({...createForm, country: e.target.value})} />
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
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : manufacturers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No manufacturers found</TableCell></TableRow>
              ) : (
                manufacturers.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{editingId === m.id ? <Input value={editForm.name ?? ""} onChange={e => setEditForm({...editForm, name: e.target.value})} /> : m.name}</TableCell>
                    <TableCell>{editingId === m.id ? <Input value={editForm.website ?? ""} onChange={e => setEditForm({...editForm, website: e.target.value})} /> : m.website || "-"}</TableCell>
                    <TableCell>{editingId === m.id ? <Input value={editForm.country ?? ""} onChange={e => setEditForm({...editForm, country: e.target.value})} /> : m.country || "-"}</TableCell>
                    <TableCell>{editingId === m.id ? <Input value={editForm.notes ?? ""} onChange={e => setEditForm({...editForm, notes: e.target.value})} /> : m.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === m.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEdit(m.id)}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditForm(m); setEditingId(m.id); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)}><Trash2 className="h-3 w-3" /></Button>
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