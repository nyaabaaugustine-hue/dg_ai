"use client";

import { PartsList } from "@/components/admin/PartsList";
import { PageHeader } from "../components/page-header";

export default function PartsPage() {
  return (
    <>
      <PageHeader title="Parts" description="Manage parts in the knowledge base." />
      <PartsList />
    </>
  );
}