import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MotDePasseOublieForm } from "@/components/forms/MotDePasseOublieForm";

describe("MotDePasseOublieForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows a generic success message after submission", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Si ce compte existe, un e-mail a été envoyé." }),
    } as Response);

    render(<MotDePasseOublieForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    await waitFor(() =>
      expect(screen.getByText("Si ce compte existe, un e-mail a été envoyé.")).toBeInTheDocument()
    );
  });
});
