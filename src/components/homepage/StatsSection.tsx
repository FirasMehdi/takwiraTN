import type { StatsAccueil } from "@/lib/homepage/queries";

const LIBELLES: { cle: keyof StatsAccueil; label: string }[] = [
  { cle: "joueurs", label: "Joueurs inscrits" },
  { cle: "proprietaires", label: "Propriétaires partenaires" },
  { cle: "terrains", label: "Terrains disponibles" },
  { cle: "matchs", label: "Matchs organisés" },
];

export function StatsSection({ stats }: { stats: StatsAccueil }) {
  return (
    <section aria-label="La communauté Takwria TN en chiffres">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LIBELLES.map(({ cle, label }) => (
          <div
            key={cle}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-primary">
              {stats[cle].toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-gray-600">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
