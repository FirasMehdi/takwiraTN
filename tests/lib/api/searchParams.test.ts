import { describe, it, expect } from "vitest";
import {
  normaliserSearchParams,
  normaliserSearchParamsRecord,
} from "@/lib/api/searchParams";

describe("normaliserSearchParams", () => {
  it("strips empty-string params", () => {
    const searchParams = new URLSearchParams("ville=Sfax&prix=");
    expect(normaliserSearchParams(searchParams)).toEqual({ ville: "Sfax" });
  });

  it("preserves the value 0 as a non-empty string", () => {
    const searchParams = new URLSearchParams("prixMax=0");
    expect(normaliserSearchParams(searchParams)).toEqual({ prixMax: "0" });
  });
});

describe("normaliserSearchParamsRecord", () => {
  it("strips empty-string params", () => {
    expect(
      normaliserSearchParamsRecord({ ville: "Sfax", prix: "" })
    ).toEqual({ ville: "Sfax" });
  });

  it("takes the first element of an array value", () => {
    expect(
      normaliserSearchParamsRecord({ ville: ["Sfax", "Ariana"] })
    ).toEqual({ ville: "Sfax" });
  });

  it("drops undefined values", () => {
    expect(normaliserSearchParamsRecord({ ville: undefined })).toEqual({});
  });
});
