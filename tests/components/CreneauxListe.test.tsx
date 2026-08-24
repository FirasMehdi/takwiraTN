import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreneauxListe } from "@/components/terrains/CreneauxListe";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

let sessionStatus = "authenticated";
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: sessionStatus }),
}));

describe("CreneauxListe", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    sessionStatus = "authenticated";
    global.fetch = vi.fn();
  });

  it("lists each slot's start and end time", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
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
    render(<CreneauxListe terrainId="t1" date="2026-09-07" creneaux={[]} />);
    expect(screen.getByText(/Aucun créneau/)).toBeInTheDocument();
  });

  it("marks an unavailable slot as taken and not clickable", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: false }]}
      />
    );

    expect(screen.getByText(/Réservé/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a confirmation panel when an available slot is clicked", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));

    expect(screen.getByText(/Réserver 08:00 — 09:30 le 2026-09-07/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument();
  });

  it("closes the confirmation panel on Annuler", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("button", { name: "Confirmer" })).not.toBeInTheDocument();
  });

  it("redirects to /connexion instead of showing a confirmation panel when logged out", () => {
    sessionStatus = "unauthenticated";
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));

    expect(pushMock).toHaveBeenCalledWith(
      "/connexion?callbackUrl=%2Fterrains%2Ft1%3Fdate%3D2026-09-07"
    );
    expect(screen.queryByRole("button", { name: "Confirmer" })).not.toBeInTheDocument();
  });

  it("books the slot on confirm and refreshes the page data", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "r1" }),
    } as Response);

    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/terrains/t1/reservations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ date: "2026-09-07", heureDebut: "08:00" }),
      })
    );
  });

  it("shows an error and keeps the panel open when the slot was just taken", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 409 } as Response);

    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() =>
      expect(screen.getByText(/vient d'être réservé/)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument();
  });
});
