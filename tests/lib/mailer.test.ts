import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();
vi.mock("resend", () => ({
  // A real class, not vi.fn().mockImplementation(...): `new Resend(...)`
  // must work reliably, and a class instance guarantees that.
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { deliverPasswordResetLink } from "@/lib/mailer";

const email = "joueur@example.com";
const resetUrl = "http://localhost:3000/reinitialiser-mot-de-passe/abc123";

describe("deliverPasswordResetLink", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the reset link to the console outside production", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    deliverPasswordResetLink({ email, resetUrl }, { NODE_ENV: "development" });

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toContain(resetUrl);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("never writes the reset link to the console in production without a provider configured", () => {
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
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends via Resend in production when RESEND_API_KEY is configured", async () => {
    mockSend.mockResolvedValue({ data: { id: "abc" }, error: null });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await deliverPasswordResetLink(
      { email, resetUrl },
      { NODE_ENV: "production", RESEND_API_KEY: "re_test_key" }
    );

    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe(email);
    expect(call.from).toBe("Takwria TN <onboarding@resend.dev>");
    expect(call.html).toContain(resetUrl);
    expect(log).not.toHaveBeenCalled();
  });

  it("uses a custom EMAIL_FROM when configured", async () => {
    mockSend.mockResolvedValue({ data: { id: "abc" }, error: null });

    await deliverPasswordResetLink(
      { email, resetUrl },
      {
        NODE_ENV: "production",
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "Takwria TN <no-reply@takwria.tn>",
      }
    );

    expect(mockSend.mock.calls[0][0].from).toBe("Takwria TN <no-reply@takwria.tn>");
  });

  it("logs an error without leaking the link when Resend returns an error", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "invalid API key" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await deliverPasswordResetLink(
      { email, resetUrl },
      { NODE_ENV: "production", RESEND_API_KEY: "re_test_key" }
    );

    expect(error).toHaveBeenCalledOnce();
    const logged = error.mock.calls[0].join(" ");
    expect(logged).not.toContain(resetUrl);
    expect(logged).toContain("invalid API key");
  });

  it("logs an error without leaking the link when Resend throws", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await deliverPasswordResetLink(
      { email, resetUrl },
      { NODE_ENV: "production", RESEND_API_KEY: "re_test_key" }
    );

    expect(error).toHaveBeenCalledOnce();
    const logged = error.mock.calls[0].join(" ");
    expect(logged).not.toContain(resetUrl);
    expect(logged).toContain("network error");
  });
});
