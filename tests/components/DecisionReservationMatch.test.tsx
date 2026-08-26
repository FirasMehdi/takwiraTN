import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DecisionReservationMatch } from "@/components/matchs/DecisionReservationMatch";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

describe("DecisionReservationMatch", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("asks the organizer whether to book the slot", () => {
    render(<DecisionReservationMatch matchId="m1" />);
    expect(screen.getByText("Réserver ce créneau ?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réserver le créneau" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Non merci" })).toBeEnabled();
  });

  it("posts reserver: true when booking", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<DecisionReservationMatch matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Réserver le créneau" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("/api/matchs/m1/reservation");
    expect(JSON.parse(String(init?.body))).toEqual({ reserver: true });
  });

  it("posts reserver: false when declining", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<DecisionReservationMatch matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Non merci" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ reserver: false });
  });

  it("shows the server error message on failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ce créneau est déjà réservé" }),
    } as Response);
    render(<DecisionReservationMatch matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Réserver le créneau" }));

    await waitFor(() =>
      expect(screen.getByText("Ce créneau est déjà réservé")).toBeInTheDocument()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
