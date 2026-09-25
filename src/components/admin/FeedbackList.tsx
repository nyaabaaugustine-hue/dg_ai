"use client";

import { useState } from "react";
import { useFeedback, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["open", "resolved", "dismissed"] as const;
const TYPE_LABELS: Record<string, string> = {
  RECOMMENDATION_ACCEPTED: "✅ Recommendation Accepted",
  RECOMMENDATION_REJECTED: "❌ Recommendation Rejected",
  WRONG_PART: "⚠️ Wrong Part",
  MISUNDERSTOOD_LOCAL_NAME: "🗣️ Misunderstood Local Name",
  PRICE_CORRECTED: "💰 Price Corrected",
  COMPATIBILITY_CORRECTED: "🔧 Compatibility Corrected",
  OTHER: "📝 Other",
};

export function FeedbackList() {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data, error, isLoading, mutate } = useFeedback({ page, limit: 50 });

  const handleEdit = async (id: string) => {
    await apiCall("/api/admin/feedback", { method: "PUT", body: JSON.stringify({ id, status: editForm.status }) });
    setEditingId(null);
    mutate();
  };

  const feedback = data?.feedback || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  if (error) return <div className="text-red-500">Failed to load feedback</div>;

  return (
    <Card>
      <CardHeader><CardTitle>Human Feedback ({total})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>User Input</TableHead>
                <TableHead>AI Response</TableHead>
                <TableHead>Correction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : feedback.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No feedback</TableCell></TableRow>
              ) : (
                feedback.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell><Badge variant="secondary">{TYPE_LABELS[f.feedbackType] || f.feedbackType}</Badge></TableCell>
                    <TableCell>{f.partName || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{f.userInput || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{f.aiResponse || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{f.correctionText || "-"}</TableCell>
                    <TableCell>
                      {editingId === f.id ? (
                        <Select value={editForm.status ?? f.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={f.status === "resolved" ? "default" : f.status === "dismissed" ? "secondary" : "outline"}>{f.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(f.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === f.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEdit(f.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => { setEditForm(f); setEditingId(f.id); }}>Edit</Button>
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