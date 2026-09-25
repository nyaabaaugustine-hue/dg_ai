"use client";

import { AliasesList } from "@/components/admin/AliasesList";
import { PageHeader } from "../components/page-header";

export default function AliasesPage() {
  return (
    <>
      <PageHeader title="Aliases" description="Local names, mechanic terminology and slang for parts." />
      <AliasesList />
    </>
  );
}