import Link from "next/link";

export type AudienceFeature = {
  titre: string;
  description: string;
};

export function AudienceSection({
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  ctaHref,
  variant,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: AudienceFeature[];
  ctaLabel: string;
  ctaHref: string;
  variant: "joueur" | "proprietaire";
}) {
  const estProprietaire = variant === "proprietaire";

  return (
    <section
      className={
        estProprietaire
          ? "rounded-xl border border-anthracite bg-anthracite p-5 shadow-sm"
          : "rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      <span
        className={
          estProprietaire
            ? "rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite"
            : "rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
        }
      >
        {eyebrow}
      </span>

      <h2
        className={`mt-3 text-xl font-bold ${
          estProprietaire ? "text-white" : "text-anthracite"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${estProprietaire ? "text-white/80" : "text-gray-600"}`}>
        {description}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature.titre} className="flex gap-3">
            <span
              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                estProprietaire ? "bg-accent" : "bg-primary"
              }`}
              aria-hidden="true"
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  estProprietaire ? "text-white" : "text-anthracite"
                }`}
              >
                {feature.titre}
              </p>
              <p className={`text-sm ${estProprietaire ? "text-white/70" : "text-gray-600"}`}>
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={
          estProprietaire
            ? "mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-anthracite transition hover:bg-accent/90"
            : "mt-5 block rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary-dark"
        }
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
