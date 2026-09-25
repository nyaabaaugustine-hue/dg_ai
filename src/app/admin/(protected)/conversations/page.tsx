"use client";

import { ConversationsList } from "@/components/admin/ConversationsList";
import { PageHeader } from "../components/page-header";

export default function ConversationsPage() {
  return (
    <>
      <PageHeader title="AI conversations" description="Every AI answer is traceable for debugging and improvement." />
      <ConversationsList />
    </>
  );
}