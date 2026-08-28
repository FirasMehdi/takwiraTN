import { findStatsAccueil } from "@/lib/homepage/queries";
import { HeroSection } from "@/components/homepage/HeroSection";
import { StatsSection } from "@/components/homepage/StatsSection";
import { AudienceSection } from "@/components/homepage/AudienceSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";

export const revalidate = 300;

export default async function HomePage() {
  const stats = await findStatsAccueil();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <HeroSection />

        <StatsSection stats={stats} />

        <AudienceSection
          eyebrow="Pour les joueurs"
          title="Trouvez votre prochain match en quelques clics"
          description="Parcourez les terrains disponibles près de chez vous, réservez un créneau, ou rejoignez un match déjà organisé pour compléter une équipe."
          features={[
            {
              titre: "Cherchez un terrain",
              description:
                "Filtrez par ville, format et prix, et consultez les créneaux libres en temps réel.",
            },
            {
              titre: "Rejoignez un match",
              description:
                "Trouvez des matchs ouverts près de chez vous et inscrivez-vous en un instant.",
            },
            {
              titre: "Formez votre équipe",
              description:
                "Ajoutez des coéquipiers, discutez en groupe et organisez vos parties.",
            },
          ]}
          ctaLabel="Rejoindre en tant que joueur"
          ctaHref="/inscription"
          variant="joueur"
        />

        <AudienceSection
          eyebrow="Pour les propriétaires"
          title="Remplissez votre terrain, pas votre agenda papier"
          description="Publiez votre terrain, définissez vos horaires et vos tarifs, et laissez les joueurs réserver directement en ligne."
          features={[
            {
              titre: "Publiez votre terrain",
              description:
                "Ajoutez photos, équipements, formats proposés et tarifs en quelques minutes.",
            },
            {
              titre: "Gérez vos réservations",
              description:
                "Toutes vos réservations centralisées au même endroit, sans double réservation.",
            },
            {
              titre: "Touchez de nouveaux joueurs",
              description: "Votre terrain visible par toute la communauté Takwria TN.",
            },
          ]}
          ctaLabel="Inscrire mon terrain"
          ctaHref="/inscription?type=proprietaire"
          variant="proprietaire"
        />

        <HowItWorksSection />
      </div>
    </main>
  );
}
