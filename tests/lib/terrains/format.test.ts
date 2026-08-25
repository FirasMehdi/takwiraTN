import { describe, it, expect } from "vitest";
import {
  formatPrix,
  libelleFormat,
  libelleType,
  libelleEquipement,
} from "@/lib/terrains/format";

describe("formatPrix", () => {
  it("renders millimes as dinars with three decimals", () => {
    expect(formatPrix(60000)).toBe("60,000 DT");
  });

  it("renders a non-round amount", () => {
    expect(formatPrix(45500)).toBe("45,500 DT");
  });

  it("renders zero", () => {
    expect(formatPrix(0)).toBe("0,000 DT");
  });

  it("handles negative input correctly", () => {
    expect(formatPrix(-500)).toBe("-0,500 DT");
    expect(formatPrix(-1000)).toBe("-1,000 DT");
  });
});

describe("libelleFormat", () => {
  it("maps the enum values to French labels", () => {
    expect(libelleFormat("cinq")).toBe("5 contre 5");
    expect(libelleFormat("sept")).toBe("7 contre 7");
    expect(libelleFormat("onze")).toBe("11 contre 11");
  });

  it("maps quatre to '4 contre 4'", () => {
    expect(libelleFormat("quatre")).toBe("4 contre 4");
  });

  it("maps six to '6 contre 6'", () => {
    expect(libelleFormat("six")).toBe("6 contre 6");
  });

  it("maps huit to '8 contre 8'", () => {
    expect(libelleFormat("huit")).toBe("8 contre 8");
  });

  it("maps neuf to '9 contre 9'", () => {
    expect(libelleFormat("neuf")).toBe("9 contre 9");
  });
});

describe("libelleType", () => {
  it("maps the enum values to French labels", () => {
    expect(libelleType("gazon_synthetique")).toBe("Gazon synthétique");
    expect(libelleType("gazon_naturel")).toBe("Gazon naturel");
    expect(libelleType("beton")).toBe("Béton");
  });
});

describe("libelleEquipement", () => {
  it("maps known equipment to French labels", () => {
    expect(libelleEquipement("vestiaires")).toBe("Vestiaires");
    expect(libelleEquipement("eclairage")).toBe("Éclairage");
  });

  it("falls back to the raw value for unknown equipment", () => {
    expect(libelleEquipement("sauna")).toBe("sauna");
  });
});
