import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DemandeCard } from "@/components/amis/DemandeCard";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("DemandeCard", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("shows the requester's name", () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    expect(screen.getByText("Amine")).toBeInTheDocument();
  });

  it("accepts the request and refreshes", async () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/amis/d1/accepter", { method: "POST" });
  });

  it("declines the request and refreshes", async () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/amis/d1/refuser", { method: "POST" });
  });
});
