import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListeReservations } from "@/components/reservations/ListeReservations";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const reservationAVenir = {
  id: "r1",
  terrainId: "t1",
  terrainNom: "Complexe El Menzah",
  terrainVille: "Tunis",
  date: "2099-01-01",
  heureDebut: "18:00",
  heureFin: "19:30",
  statut: "confirmee" as const,
  annulable: true,
};

describe("ListeReservations", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("shows an empty state when there is no reservation", () => {
    render(<ListeReservations reservations={[]} />);
    expect(screen.getByText(/aucune réservation/i)).toBeInTheDocument();
  });

  it("lists an upcoming reservation with a cancel button", () => {
    render(<ListeReservations reservations={[reservationAVenir]} />);

    expect(screen.getByText("Complexe El Menzah")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("hides the cancel button and explains why when not cancellable", () => {
    render(
      <ListeReservations reservations={[{ ...reservationAVenir, annulable: false }]} />
    );

    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    expect(screen.getByText("Non annulable")).toBeInTheDocument();
  });

  it("cancels a reservation and refreshes", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<ListeReservations reservations={[reservationAVenir]} />);

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/reservations/r1/annuler", { method: "POST" });
  });

  it("shows an error message when cancellation fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
    render(<ListeReservations reservations={[reservationAVenir]} />);

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(screen.getByText("Impossible d'annuler cette réservation.")).toBeInTheDocument()
    );
  });

  it("shows past reservations separately without a cancel action", () => {
    render(
      <ListeReservations
        reservations={[{ ...reservationAVenir, date: "2020-01-01", statut: "confirmee" as const }]}
      />
    );

    expect(screen.getByText("Terminée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
  });

  it("labels a cancelled reservation distinctly from a past-but-not-cancelled one", () => {
    render(
      <ListeReservations
        reservations={[{ ...reservationAVenir, statut: "annulee" as const, annulable: false }]}
      />
    );

    expect(screen.getByText("Annulée")).toBeInTheDocument();
  });
});
