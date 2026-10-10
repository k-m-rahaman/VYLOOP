import { describe, expect, it } from "vitest";
import { saveBrowserSnapshot, STORAGE_WARNING } from "./browser-storage";

describe("browser persistence", () => {
  it("writes a recoverable JSON snapshot under the requested key", () => {
    const values = new Map<string, string>();
    expect(saveBrowserSnapshot(() => ({ setItem: (key, value) => { values.set(key, value); } }), "demo", { expenses: [{ amountPaise: 125 }] })).toBeNull();
    expect(JSON.parse(values.get("demo")!)).toEqual({ expenses: [{ amountPaise: 125 }] });
  });
  it("warns if privacy settings prevent accessing localStorage", () => {
    expect(saveBrowserSnapshot(() => { throw new Error("Access denied"); }, "demo", {})).toBe(STORAGE_WARNING);
  });
  it("warns if storage is full without deleting an existing snapshot", () => {
    const values = new Map([["demo", "previous snapshot"]]);
    expect(saveBrowserSnapshot(() => ({ setItem: () => { throw new Error("Quota exceeded"); } }), "demo", {})).toBe(STORAGE_WARNING);
    expect(values.get("demo")).toBe("previous snapshot");
  });
});
