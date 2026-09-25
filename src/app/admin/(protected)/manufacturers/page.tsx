"use client";

import { ManufacturersList } from "@/components/admin/ManufacturersList";
import { PageHeader } from "../components/page-header";

export default function ManufacturersPage() {
  return (
    <>
      <PageHeader title="Manufacturers" description="Part manufacturers and local distributors." />
      <ManufacturersList />
    </>
  );
}