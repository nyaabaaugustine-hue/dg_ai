"use client";

import { useState } from "react";
import { useConversations, apiCall } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronRight } from "lucide-react";

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export function ConversationsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const { data, error, isLoading } = useConversations({ page, limit: 20, search });

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    const res = await apiCall(`/api/admin/conversations/${id}`);
    setDetail(res);
  };

  const conversations = data?.conversations || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  if (error) return <div className="text-red-500">Failed to load conversations</div>;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversations ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No conversations</div>
            ) : (
              conversations.map((c: any) => (
                <Button
                  key={c.id}
                  variant={selectedId === c.id ? "default" : "outline"}
                  className="w-full justify-start text-left gap-2"
                  onClick={() => handleSelect(c.id)}
                >
                  <div className="flex-1">
                    <p className="font-medium truncate">{c.title || `Session ${(c.sessionId || "").slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground">{c.messageCount} messages • {formatDate(c.startedAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ))
            )}
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

      {selectedId && detail && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{detail.title || `Conversation ${detail.sessionId || detail.id}`}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto space-y-4">
            {(detail.messages || []).map((m: any) => (
              <div key={m.id} className={`flex gap-2 ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "USER" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}