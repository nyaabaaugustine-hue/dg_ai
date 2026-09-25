"use client";

import { useState } from "react";
import { useParts, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

export function PartsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", description: "", category: "", subcategory: "", partNumber: "",
    vehicleSystem: "", manufacturerId: "", stockQty: 0,
  });

  const { data, error, isLoading, mutate } = useParts({ page, limit: 20, search });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiCall("/api/admin/parts", { method: "POST", body: JSON.stringify(createForm) });
    setShowCreate(false);
    setCreateForm({ name: "", description: "", category: "", subcategory: "", partNumber: "", vehicleSystem: "", manufacturerId: "", stockQty: 0 });
    mutate();
  };

  const handleEdit = async (id: string) => {
    const payload = {
      name: editForm.name,
      description: editForm.description,
      category: editForm.category,
      subcategory: editForm.subcategory,
      partNumber: editForm.part_number ?? editForm.partNumber,
      vehicleSystem: editForm.vehicle_system ?? editForm.vehicleSystem,
      manufacturerId: editForm.manufacturer_id ?? editForm.manufacturerId,
      stockQty: editForm.stock_qty ?? editForm.stockQty,
      active: editForm.active,
    };
    await apiCall(`/api/admin/parts/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditingId(null);
    mutate();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this part?")) return;
    await apiCall(`/api/admin/parts/${id}`, { method: "DELETE" });
    mutate();
  };

  const parts = data?.parts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  if (error) return <div className="text-red-500">Failed to load parts</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Parts ({total})</CardTitle>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Add Part</Button>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">Create New Part</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name*" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} required />
              <Input placeholder="Part Number" value={createForm.partNumber} onChange={e => setCreateForm({...createForm, partNumber: e.target.value})} />
              <Input placeholder="Category" value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})} />
              <Input placeholder="Subcategory" value={createForm.subcategory} onChange={e => setCreateForm({...createForm, subcategory: e.target.value})} />
              <Input placeholder="Vehicle System" value={createForm.vehicleSystem} onChange={e => setCreateForm({...createForm, vehicleSystem: e.target.value})} />
              <Input placeholder="Manufacturer ID" value={createForm.manufacturerId} onChange={e => setCreateForm({...createForm, manufacturerId: e.target.value})} />
              <Input type="number" placeholder="Stock Qty" value={createForm.stockQty} onChange={e => setCreateForm({...createForm, stockQty: parseInt(e.target.value)})} />
              <Input placeholder="Description" value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} className="col-span-2" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="mb-4 flex gap-2">
          <Input placeholder="Search parts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-64" />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Prices</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : parts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No parts found</TableCell></TableRow>
              ) : (
                parts.map((part: any) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      {editingId === part.id ? (
                        <Input value={editForm.name ?? ""} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                      ) : part.name}
                    </TableCell>
                    <TableCell>
                      {editingId === part.id ? (
                        <Input value={editForm.part_number ?? ""} onChange={e => setEditForm({...editForm, part_number: e.target.value})} />
                      ) : part.part_number || "-"}
                    </TableCell>
                    <TableCell>
                      {editingId === part.id ? (
                        <Input value={editForm.category ?? ""} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                      ) : part.category || "-"}
                    </TableCell>
                    <TableCell>
                      {editingId === part.id ? (
                        <Input
                          value={editForm.manufacturer_id ?? ""}
                          onChange={e => setEditForm({...editForm, manufacturer_id: e.target.value})}
                          placeholder={part.manufacturer_name || "Manufacturer ID"}
                        />
                      ) : part.manufacturer_name || "-"}
                    </TableCell>
                    <TableCell>
                      {editingId === part.id ? (
                        <Input type="number" value={editForm.stock_qty ?? ""} onChange={e => setEditForm({...editForm, stock_qty: parseInt(e.target.value)})} />
                      ) : part.stock_qty ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      {(part.prices || []).slice(0, 2).map((p: any) => (
                        <Badge key={p.grade} variant="secondary" className="mr-1">{p.grade}: GH₵{p.price}</Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === part.id ? (
                          <>
                            <Button size="sm" variant="default" onClick={() => handleEdit(part.id)}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditForm(part); setEditingId(part.id); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)} disabled={deletingId === part.id}><Trash2 className="h-3 w-3" /></Button>
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

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}