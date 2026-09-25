"use client";

import { VehiclesList } from "@/components/admin/VehiclesList";
import { PageHeader } from "../components/page-header";

export default function VehiclesPage() {
  return (
    <>
      <PageHeader title="Vehicles" description="Supported vehicles (initially Bajaj and TVS three-wheelers)." />
      <VehiclesList />
    </>
  );
}