import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "../components/page-header";
import { Button } from "@/components/ui/button";

export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { _count: { select: { messages: true } } },
  });

  return (
    <>
      <PageHeader title="AI conversations" description="Every AI answer is traceable for debugging and improvement." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Messages</th>
              <th className="p-3 font-medium">Started</th>
              <th className="p-3 font-medium">Last activity</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.title ?? c.id.slice(0, 12)}</td>
                <td className="p-3 text-muted-foreground">{c._count.messages}</td>
                <td className="p-3 text-muted-foreground">{c.startedAt.toLocaleString()}</td>
                <td className="p-3 text-muted-foreground">{c.updatedAt.toLocaleString()}</td>
                <td className="p-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/conversations/${c.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
