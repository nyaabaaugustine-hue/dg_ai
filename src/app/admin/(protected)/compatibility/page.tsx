"use client";

import { CompatibilitiesManager } from "@/components/admin/CompatibilitiesManager";
import { PageHeader } from "../components/page-header";

export default function CompatibilityPage() {
  return (
    <>
      <PageHeader title="Compatibility" description="Vehicle ↔ part compatibility. The AI never assumes compatibility without a record." />
      <CompatibilitiesManager />
    </>
  );
}