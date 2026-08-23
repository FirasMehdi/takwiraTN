import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center gap-8 bg-gray-50 px-4 py-14 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite">
          ⚽ Nouveau à Tunis, Sfax, Sousse et Ariana
        </span>
        <h1 className="text-3xl font-bold text-anthracite">Takwria TN</h1>
        <p className="max-w-xs text-gray-600">
          Trouve ton terrain. Forme ton équipe. Joue ton match.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/terrains"
          className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
        >
          Réserver un terrain
        </Link>
        <Link
          href="/matchs"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
        >
          Rejoindre un match
        </Link>
      </div>
    </main>
  );
}
