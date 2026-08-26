import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";

describe("HowItWorksSection", () => {
  it("shows a heading", () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole("heading", { name: "Comment ça marche" })
    ).toBeInTheDocument();
  });

  it("lists the three steps in order", () => {
    render(<HowItWorksSection />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Créez votre compte");
    expect(items[1]).toHaveTextContent("Trouvez ou publiez un terrain");
    expect(items[2]).toHaveTextContent("Jouez");
  });
});
