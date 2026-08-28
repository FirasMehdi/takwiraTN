import Link from "next/link";
import { findAdminJoueurs } from "@/lib/admin/joueurs";
import { adminListQuerySchema } from "@/lib/validation/admin";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";
import { AdminRecherche } from "@/components/admin/AdminRecherche";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminJoueursPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const brut = normaliserSearchParamsRecord(params);
  const parsed = adminListQuerySchema.safeParse(brut);
  const q = parsed.success ? parsed.data.q : undefined;
  const joueurs = await findAdminJoueurs(q);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-anthracite">Joueurs</h1>
      <AdminRecherche basePath="/admin/joueurs" valeur={q ?? ""} placeholder="Nom ou e-mail..." />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Prénom</th>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2">Ville</th>
              <th className="px-4 py-2">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {joueurs.map((joueur) => (
              <tr key={joueur.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/admin/joueurs/${joueur.id}`} className="font-medium text-primary hover:underline">
                    {joueur.prenom}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{joueur.email}</td>
                <td className="px-4 py-2 text-gray-600">{joueur.ville}</td>
                <td className="px-4 py-2 text-gray-600">
                  {new Intl.DateTimeFormat("fr-TN").format(joueur.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {joueurs.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-600">Aucun joueur ne correspond à cette recherche.</p>
        )}
      </div>
    </div>
  );
}
