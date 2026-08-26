const ETAPES = [
  {
    numero: 1,
    titre: "Créez votre compte",
    description: "Inscrivez-vous en tant que joueur ou propriétaire, gratuitement.",
  },
  {
    numero: 2,
    titre: "Trouvez ou publiez un terrain",
    description: "Parcourez les terrains disponibles, ou ajoutez le vôtre en quelques minutes.",
  },
  {
    numero: 3,
    titre: "Jouez",
    description: "Réservez un créneau, rejoignez un match, et jouez.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-anthracite">Comment ça marche</h2>

      <ol className="mt-4 flex flex-col gap-4">
        {ETAPES.map((etape) => (
          <li key={etape.numero} className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {etape.numero}
            </span>
            <div>
              <p className="text-sm font-semibold text-anthracite">{etape.titre}</p>
              <p className="text-sm text-gray-600">{etape.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
