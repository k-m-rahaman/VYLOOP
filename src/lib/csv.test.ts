import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "./csv";

describe("CSV expense cells", () => {
  it.each(["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", "  =1+1", "\t=1+1", "\r+1", "\n@SUM(A1)", " \t\u0000=1+1"])("stores potential formula %j as text", (value) => {
    expect(escapeCsvCell(value)).toBe(`"'${value}"`);
  });
  it("preserves commas, quotes, and newlines inside a quoted cell", () => {
    expect(escapeCsvCell('Lunch, "with friends"\nCafe')).toBe('"Lunch, ""with friends""\nCafe"');
  });
  it("keeps dates, ordinary descriptions, and exact amount text unchanged", () => {
    expect(escapeCsvCell("2026-10-10")).toBe('"2026-10-10"');
    expect(escapeCsvCell("Cafe + snack")).toBe('"Cafe + snack"');
    expect(escapeCsvCell("125.50")).toBe('"125.50"');
    expect(escapeCsvCell(0)).toBe('"0"');
  });
});
