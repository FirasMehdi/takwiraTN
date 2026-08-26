import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudienceSection } from "@/components/homepage/AudienceSection";

const features = [
  { titre: "Cherchez un terrain", description: "Filtrez par ville, format et prix." },
  { titre: "Rejoignez un match", description: "Trouvez des matchs ouverts près de chez vous." },
];

describe("AudienceSection", () => {
  it("renders the eyebrow, title, description and features", () => {
    render(
      <AudienceSection
        eyebrow="Pour les joueurs"
        title="Trouvez votre prochain match"
        description="Une description."
        features={features}
        ctaLabel="Rejoindre en tant que joueur"
        ctaHref="/inscription"
        variant="joueur"
      />
    );

    expect(screen.getByText("Pour les joueurs")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trouvez votre prochain match" })
    ).toBeInTheDocument();
    expect(screen.getByText("Une description.")).toBeInTheDocument();
    expect(screen.getByText("Cherchez un terrain")).toBeInTheDocument();
    expect(screen.getByText("Rejoignez un match")).toBeInTheDocument();
  });

  it("links the CTA to the given href with the given label", () => {
    render(
      <AudienceSection
        eyebrow="Pour les propriétaires"
        title="Remplissez votre terrain"
        description="Une description."
        features={features}
        ctaLabel="Inscrire mon terrain"
        ctaHref="/inscription?type=proprietaire"
        variant="proprietaire"
      />
    );

    expect(
      screen.getByRole("link", { name: "Inscrire mon terrain" })
    ).toHaveAttribute("href", "/inscription?type=proprietaire");
  });

  it("renders both variants without crashing", () => {
    const { rerender } = render(
      <AudienceSection
        eyebrow="Pour les joueurs"
        title="Titre joueur"
        description="Description."
        features={features}
        ctaLabel="CTA joueur"
        ctaHref="/inscription"
        variant="joueur"
      />
    );
    expect(screen.getByRole("heading", { name: "Titre joueur" })).toBeInTheDocument();

    rerender(
      <AudienceSection
        eyebrow="Pour les propriétaires"
        title="Titre propriétaire"
        description="Description."
        features={features}
        ctaLabel="CTA propriétaire"
        ctaHref="/inscription?type=proprietaire"
        variant="proprietaire"
      />
    );
    expect(screen.getByRole("heading", { name: "Titre propriétaire" })).toBeInTheDocument();
  });

  it("applies the anthracite card styling only for the proprietaire variant", () => {
    const { container, rerender } = render(
      <AudienceSection
        eyebrow="Pour les joueurs"
        title="Titre joueur"
        description="Description."
        features={features}
        ctaLabel="CTA joueur"
        ctaHref="/inscription"
        variant="joueur"
      />
    );
    expect(container.querySelector("section")).not.toHaveClass("bg-anthracite");

    rerender(
      <AudienceSection
        eyebrow="Pour les propriétaires"
        title="Titre propriétaire"
        description="Description."
        features={features}
        ctaLabel="CTA propriétaire"
        ctaHref="/inscription?type=proprietaire"
        variant="proprietaire"
      />
    );
    expect(container.querySelector("section")).toHaveClass("bg-anthracite");
  });
});
