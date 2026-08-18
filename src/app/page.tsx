import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center gap-6 px-4 py-10 text-center">
      <h1 className="text-3xl font-bold text-primary">Takwria TN</h1>
      <p className="text-lg">Trouve ton terrain. Forme ton équipe. Joue ton match.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/terrains" className="rounded-lg bg-primary px-4 py-3 font-semibold text-white">
          Réserver un terrain
        </Link>
        <Link
          href="/matchs"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary"
        >
          Rejoindre un match
        </Link>
      </div>
    </main>
  );
}
