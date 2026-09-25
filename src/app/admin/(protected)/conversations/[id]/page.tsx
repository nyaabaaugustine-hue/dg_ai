import { notFound } from "next/navigation";
import { prisma } from "@/lib/db-prisma";
import { PageHeader } from "../../components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_STYLES: Record<string, string> = {
  USER: "default",
  ASSISTANT: "secondary",
  TOOL: "outline",
  SYSTEM: "destructive",
};

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } }, feedback: { orderBy: { createdAt: "desc" } } },
  });

  if (!conversation) notFound();

  return (
    <>
      <PageHeader title={conversation.title ?? conversation.id} description={`Started ${conversation.startedAt.toLocaleString()} · ${conversation.messages.length} messages`} />
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            {conversation.messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={(ROLE_STYLES[m.role] as never) ?? "outline"}>{m.role}</Badge>
                  <span className="text-muted-foreground text-xs">{m.createdAt.toLocaleString()}</span>
                  {m.model && <span className="text-muted-foreground text-xs">{m.model}</span>}
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans text-sm">{m.content}</pre>
                {m.toolsCalled && (
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/20 p-2 font-mono text-xs text-muted-foreground">{JSON.stringify(m.toolsCalled, null, 2)}</pre>
                )}
              </div>
            ))}
            {conversation.messages.length === 0 && <p className="text-muted-foreground">No messages.</p>}
          </CardContent>
        </Card>

        {conversation.feedback.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-2 font-semibold">Feedback</h2>
              <ul className="space-y-2 text-sm">
                {conversation.feedback.map((f) => (
                  <li key={f.id} className="rounded-md border p-2">
                    <Badge>{f.feedbackType.replaceAll("_", " ")}</Badge>
                    <span className="text-muted-foreground text-xs"> · {f.createdAt.toLocaleString()}</span>
                    {f.correctionText && <p className="mt-1">{f.correctionText}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
