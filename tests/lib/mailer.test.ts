import { describe, it, expect, vi, afterEach } from "vitest";
import { deliverPasswordResetLink } from "@/lib/mailer";

const email = "joueur@example.com";
const resetUrl = "http://localhost:3000/reinitialiser-mot-de-passe/abc123";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deliverPasswordResetLink", () => {
  it("logs the reset link to the console outside production", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    deliverPasswordResetLink({ email, resetUrl }, { NODE_ENV: "development" });

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toContain(resetUrl);
  });

  it("never writes the reset link to the console in production", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    deliverPasswordResetLink({ email, resetUrl }, { NODE_ENV: "production" });

    expect(log).not.toHaveBeenCalled();

    // It must still surface that delivery failed — silently dropping the
    // request would leave users waiting for an e-mail that never comes.
    expect(error).toHaveBeenCalledOnce();
    const logged = error.mock.calls[0].join(" ");
    expect(logged).not.toContain(resetUrl);
    expect(logged).not.toContain("abc123");
  });
});
