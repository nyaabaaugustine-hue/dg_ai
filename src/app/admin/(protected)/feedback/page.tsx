"use client";

import { FeedbackList } from "@/components/admin/FeedbackList";
import { PageHeader } from "../components/page-header";

export default function FeedbackPage() {
  return (
    <>
      <PageHeader title="Feedback" description="Corrections recorded from AI conversations. Use these to improve the knowledge base." />
      <FeedbackList />
    </>
  );
}