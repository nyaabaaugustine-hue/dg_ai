"use client";

import { PricesTable } from "@/components/admin/PricesTable";
import { PageHeader } from "../components/page-header";

export default function PricesPage() {
  return (
    <>
      <PageHeader title="Prices" description="Current prices are never silently overwritten — deactivating a price creates history." />
      <PricesTable />
    </>
  );
}