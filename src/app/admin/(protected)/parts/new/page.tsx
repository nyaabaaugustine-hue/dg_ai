import { prisma } from "@/lib/db";
import { PageHeader } from "../../components/page-header";
import { PartForm } from "../../components/part-form";

export default async function NewPartPage() {
  const manufacturers = await prisma.manufacturer.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="New part" description="Add a part to the knowledge base." />
      <div className="max-w-2xl">
        <PartForm manufacturers={manufacturers} />
      </div>
    </>
  );
}
