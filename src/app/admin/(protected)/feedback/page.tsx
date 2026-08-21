import { prisma } from "@/lib/db";
import { PageHeader } from "../components/page-header";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  open: "secondary",
  reviewed: "default",
  closed: "outline",
};

export default async function FeedbackPage() {
  const feedback = await prisma.humanFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { part: { select: { name: true } }, conversation: { select: { title: true } } },
  });

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Corrections recorded from AI conversations. Use these to improve the knowledge base."
      />
      <div className="space-y-3">
        {feedback.length === 0 && <p className="text-muted-foreground">No feedback recorded yet.</p>}
        {feedback.map((f) => (
          <div key={f.id} className="rounded-lg border p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{f.feedbackType.replaceAll("_", " ")}</Badge>
                <Badge variant={(STATUS_STYLES[f.status] as never) ?? "outline"}>{f.status}</Badge>
                {f.part && <Badge variant="outline">{f.part.name}</Badge>}
              </div>
              <span className="text-muted-foreground text-xs">{f.createdAt.toLocaleString()}</span>
            </div>
            {f.userInput && (
              <p className="text-sm">
                <span className="text-muted-foreground">Customer said: </span>
                {f.userInput}
              </p>
            )}
            {f.aiResponse && (
              <p className="mt-1 line-clamp-3 text-sm">
                <span className="text-muted-foreground">AI said: </span>
                {f.aiResponse}
              </p>
            )}
            {f.correctionText && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Correction: </span>
                {f.correctionText}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
