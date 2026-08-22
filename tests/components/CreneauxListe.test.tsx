import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreneauxListe } from "@/components/terrains/CreneauxListe";

describe("CreneauxListe", () => {
  it("lists each slot's start and end time", () => {
    render(
      <CreneauxListe
        creneaux={[
          { debut: "08:00", fin: "09:30", disponible: true },
          { debut: "09:30", fin: "11:00", disponible: true },
        ]}
      />
    );

    expect(screen.getByText("08:00 — 09:30")).toBeInTheDocument();
    expect(screen.getByText("09:30 — 11:00")).toBeInTheDocument();
  });

  it("shows an empty state when there is no slot", () => {
    render(<CreneauxListe creneaux={[]} />);
    expect(screen.getByText(/Aucun créneau/)).toBeInTheDocument();
  });

  it("disables the booking button on every slot for now", () => {
    render(
      <CreneauxListe creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]} />
    );

    // La réservation arrive au sous-projet 3.
    expect(screen.getByRole("button", { name: /Réserver/ })).toBeDisabled();
  });

  it("marks an unavailable slot as taken", () => {
    render(
      <CreneauxListe creneaux={[{ debut: "08:00", fin: "09:30", disponible: false }]} />
    );

    expect(screen.getByText(/Réservé/)).toBeInTheDocument();
  });
});
