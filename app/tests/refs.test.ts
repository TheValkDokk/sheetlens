import { describe, expect, it } from "vitest";
import { resolveRef } from "../src/core/refs";

const sheets = [{ name: "Model" }, { name: "Q3 Data" }];

describe("resolveRef", () => {
  it("resolves a lower-case sheet name to the real sheet (regression: false 'safe to edit')", () => {
    const r = resolveRef("model!b4", sheets);
    expect(r.error).toBeNull();
    expect(r.ref).toEqual({ sheet: "Model", addr: "B4" });
  });

  it("reports an unknown sheet instead of returning no dependents", () => {
    const r = resolveRef("Nope!B4", sheets);
    expect(r.ref).toBeNull();
    expect(r.error).toContain("No sheet named");
  });

  it("rejects a non-address", () => {
    const r = resolveRef("Model!hello", sheets);
    expect(r.ref).toBeNull();
    expect(r.error).toContain("not a cell address");
  });

  it("defaults to the first sheet and strips dollar signs", () => {
    expect(resolveRef("$B$4", sheets).ref).toEqual({ sheet: "Model", addr: "B4" });
  });

  it("handles a quoted sheet name containing a space", () => {
    expect(resolveRef("'Q3 Data'!C2", sheets).ref).toEqual({ sheet: "Q3 Data", addr: "C2" });
  });

  it("returns nothing for empty input", () => {
    expect(resolveRef("  ", sheets).ref).toBeNull();
  });
});
