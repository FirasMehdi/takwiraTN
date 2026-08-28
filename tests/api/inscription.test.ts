import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { resetRateLimits } from "@/lib/rateLimit";
import { POST } from "@/app/api/inscription/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/inscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/inscription", () => {
  beforeEach(async () => {
    await resetDb();
    resetRateLimits();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user and profile with valid data", async () => {
    const response = await POST(
      makeRequest({
        email: "nouveau@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
      })
    );

    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({
      where: { email: "nouveau@example.com" },
      include: { profile: true },
    });
    expect(user?.profile?.prenom).toBe("Sami");
  });

  it("rejects a duplicate e-mail", async () => {
    await POST(
      makeRequest({ email: "dup@example.com", password: "motdepasse123", prenom: "A", ville: "Tunis" })
    );

    const response = await POST(
      makeRequest({ email: "dup@example.com", password: "autremdp123", prenom: "B", ville: "Sfax" })
    );

    expect(response.status).toBe(409);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ email: "pas-un-email", password: "123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 instead of throwing on malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      })
    );
    expect(response.status).toBe(400);
  });

  it("normalizes e-mail case so mixed-case signup can log in with lowercase e-mail", async () => {
    const response = await POST(
      makeRequest({
        email: "Mixed.Case@Example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
      })
    );
    expect(response.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email: "mixed.case@example.com" } });
    expect(user).not.toBeNull();
  });

  it("rate limits repeated signups from the same IP with 429 and a Retry-After header", async () => {
    const request = () =>
      new Request("http://localhost/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
        body: JSON.stringify({
          email: `dup-${Math.random()}@example.com`,
          password: "motdepasse123",
          prenom: "A",
          ville: "Tunis",
        }),
      });

    for (let i = 0; i < 5; i++) {
      const response = await POST(request());
      expect(response.status).not.toBe(429);
    }

    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("assigns the proprietaire role when estProprietaire is true", async () => {
    const response = await POST(
      makeRequest({
        email: "hoster@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
        estProprietaire: true,
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "hoster@example.com" } });
    expect(user?.role).toBe("proprietaire");
  });

  it("assigns the joueur role by default", async () => {
    const response = await POST(
      makeRequest({
        email: "joueur@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "joueur@example.com" } });
    expect(user?.role).toBe("joueur");
  });

  it("ignores a client-supplied role and derives it from estProprietaire only", async () => {
    const response = await POST(
      makeRequest({
        email: "sournois@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
        estProprietaire: false,
        role: "administrateur",
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "sournois@example.com" } });
    expect(user?.role).toBe("joueur");
  });
});
