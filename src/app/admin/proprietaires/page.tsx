import Link from "next/link";
import { findAdminProprietaires } from "@/lib/admin/proprietaires";
import { adminListQuerySchema } from "@/lib/validation/admin";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";
import { AdminRecherche } from "@/components/admin/AdminRecherche";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProprietairesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const brut = normaliserSearchParamsRecord(params);
  const parsed = adminListQuerySchema.safeParse(brut);
  const q = parsed.success ? parsed.data.q : undefined;
  const proprietaires = await findAdminProprietaires(q);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-anthracite">Propriétaires</h1>
      <AdminRecherche basePath="/admin/proprietaires" valeur={q ?? ""} placeholder="E-mail..." />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2">Terrains</th>
              <th className="px-4 py-2">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {proprietaires.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/admin/proprietaires/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.email}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{p.nombreTerrains}</td>
                <td className="px-4 py-2 text-gray-600">
                  {new Intl.DateTimeFormat("fr-TN").format(p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proprietaires.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-600">
            Aucun propriétaire ne correspond à cette recherche.
          </p>
        )}
      </div>
    </div>
  );
}
