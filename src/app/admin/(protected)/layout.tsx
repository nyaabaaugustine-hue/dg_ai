import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "./components/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
