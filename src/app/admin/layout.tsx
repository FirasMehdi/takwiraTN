import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const acces = requireRole(session, "administrateur");

  if (!acces.ok) {
    if (acces.statut === 401) redirect("/connexion");
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <AdminNav />
      <div className="px-4 py-6">{children}</div>
    </div>
  );
}
