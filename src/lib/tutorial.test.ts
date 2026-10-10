import { describe, expect, it } from "vitest";
import {
  resetTutorialPreference,
  saveTutorialPreference,
  shouldShowTutorial,
  TUTORIAL_VERSION,
  type TutorialStorage,
} from "./tutorial";

function memoryStorage(): TutorialStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

const demo = { mode: "demo" as const };
const alice = { mode: "cloud" as const, userId: "alice" };
const bob = { mode: "cloud" as const, userId: "bob" };

describe("first-time tutorial preferences", () => {
  it("remembers completion in the personal workspace", () => {
    const storage = memoryStorage();
    const personal = { mode: "personal" as const };
    expect(shouldShowTutorial(personal, storage)).toBe(true);
    saveTutorialPreference(personal, "completed", storage);
    expect(shouldShowTutorial(personal, storage)).toBe(false);
  });
  it("remembers a skipped personal guide and allows replay after reset", () => {
    const storage = memoryStorage();
    const personal = { mode: "personal" as const };
    saveTutorialPreference(personal, "dismissed", storage);
    expect(shouldShowTutorial(personal, storage)).toBe(false);
    resetTutorialPreference(personal, storage);
    expect(shouldShowTutorial(personal, storage)).toBe(true);
  });
  it("shows for a new visitor and remembers completion after another read", () => {
    const storage = memoryStorage();
    expect(shouldShowTutorial(demo, storage)).toBe(true);
    expect(saveTutorialPreference(demo, "completed", storage)).toBe(true);
    expect(shouldShowTutorial(demo, storage)).toBe(false);
  });

  it("remembers a skip so returning visitors are not forced through it", () => {
    const storage = memoryStorage();
    saveTutorialPreference(demo, "dismissed", storage);
    expect(shouldShowTutorial(demo, storage)).toBe(false);
  });

  it("keeps demo and signed-in accounts independent on a shared browser", () => {
    const storage = memoryStorage();
    saveTutorialPreference(demo, "completed", storage);
    expect(shouldShowTutorial(alice, storage)).toBe(true);
    saveTutorialPreference(alice, "dismissed", storage);
    expect(shouldShowTutorial(alice, storage)).toBe(false);
    expect(shouldShowTutorial(bob, storage)).toBe(true);
    expect(shouldShowTutorial(demo, storage)).toBe(false);
  });

  it("does not create a shared preference before cloud authentication finishes", () => {
    const storage = memoryStorage();
    expect(shouldShowTutorial({ mode: "cloud" }, storage)).toBe(false);
    expect(saveTutorialPreference({ mode: "cloud" }, "completed", storage)).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("reset makes just the selected scope eligible for the tutorial again", () => {
    const storage = memoryStorage();
    saveTutorialPreference(alice, "completed", storage);
    saveTutorialPreference(bob, "completed", storage);
    saveTutorialPreference(demo, "dismissed", storage);
    expect(resetTutorialPreference(alice, storage)).toBe(true);
    expect(shouldShowTutorial(alice, storage)).toBe(true);
    expect(shouldShowTutorial(bob, storage)).toBe(false);
    expect(shouldShowTutorial(demo, storage)).toBe(false);
  });

  it.each([
    JSON.stringify({ version: TUTORIAL_VERSION - 1, status: "completed" }),
    JSON.stringify({ version: TUTORIAL_VERSION + 1, status: "completed" }),
    JSON.stringify({ version: TUTORIAL_VERSION, status: "unknown" }),
    "{invalid",
    "null",
    "true",
    "[]",
  ])("shows when stored data is outdated or malformed: %s", (value) => {
    const storage = memoryStorage();
    storage.values.set("vyloop:tutorial:demo", value);
    expect(shouldShowTutorial(demo, storage)).toBe(true);
  });

  it("continues safely when browser storage is missing or blocked", () => {
    const blocked: TutorialStorage = {
      getItem: () => { throw new Error("Storage blocked"); },
      setItem: () => { throw new Error("Storage blocked"); },
      removeItem: () => { throw new Error("Storage blocked"); },
    };
    for (const storage of [blocked, null]) {
      expect(shouldShowTutorial(demo, storage)).toBe(true);
      expect(saveTutorialPreference(demo, "completed", storage)).toBe(false);
      expect(resetTutorialPreference(demo, storage)).toBe(false);
    }
  });
});
