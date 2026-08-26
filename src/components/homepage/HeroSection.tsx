import Link from "next/link";
import { TerrainIllustration } from "@/components/ui/TerrainIllustration";

export function HeroSection() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        <TerrainIllustration className="h-40 w-full object-cover" />
        <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite">
          ⚽ Nouveau à Tunis, Sfax, Sousse et Ariana
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <h1 className="text-3xl font-bold text-anthracite">Takwria TN</h1>
        <p className="max-w-sm text-gray-600">
          La plateforme tunisienne qui connecte les joueurs aux terrains — et
          les terrains aux joueurs.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/inscription"
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
          >
            Rejoindre en tant que joueur
          </Link>
          <Link
            href="/inscription?type=proprietaire"
            className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
          >
            Inscrire mon terrain
          </Link>
        </div>
      </div>
    </section>
  );
}
