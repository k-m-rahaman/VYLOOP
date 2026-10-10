import { describe, expect, it } from "vitest";
import { createPersonalState, parsePersonalBackup, parsePersonalState, readPersonalSnapshot } from "./personal-data";
import { completeQuestState, finishOnboardingState } from "./engine";

describe("personal data", () => {
  it("starts with real zero progress and no sample money records", () => {
    const state = createPersonalState();
    expect(state.profile.onboarded).toBe(false);
    expect(state.profile.name).toBe("");
    expect(state.expenses).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.xpEvents).toEqual([]);
    expect(state.completions).toEqual([]);
    expect(state.quests.length).toBeGreaterThan(0);
  });
  it("restores real activity and money without social data", () => {
    let state = finishOnboardingState(createPersonalState(), { name: "Kazi" }, 150000);
    state = completeQuestState(state, state.quests[0].id);
    expect(parsePersonalBackup(JSON.stringify({ formatVersion: 1, mode: "personal", ...state }))).toEqual(state);
  });
  it("keeps an unreadable existing snapshot intact instead of overwriting it", () => {
    const result = readPersonalSnapshot(() => ({ getItem: () => "{broken" }));
    expect(result.canPersist).toBe(false);
    expect(result.warning).toContain("unchanged");
  });
  it("handles unavailable browser storage without crashing", () => {
    expect(readPersonalSnapshot(() => { throw new Error("blocked"); }).canPersist).toBe(false);
  });
  it("rejects duplicate reward history", () => {
    const state = completeQuestState(createPersonalState(), createPersonalState().quests[0].id);
    state.completions.push(state.completions[0]);
    expect(() => parsePersonalState(state)).toThrow("duplicate");
  });
  it("accepts optional blank dates produced by the money form", () => {
    const state = createPersonalState();
    state.goals.push({ id: "goal", title: "Laptop", targetPaise: 10000, targetDate: "", contributions: [] });
    expect(parsePersonalState(state).goals[0].targetDate).toBe("");
  });
  it("rejects malformed money, dates, and unrelated JSON before replacing data", () => {
    const state = createPersonalState();
    expect(() => parsePersonalState({ ...state, budgetPaise: -1 })).toThrow();
    expect(() => parsePersonalState({ ...state, dailyQuestDays: ["2026-02-30"] })).toThrow();
    expect(() => parsePersonalBackup(JSON.stringify(state))).toThrow("exported");
    expect(() => parsePersonalBackup("x".repeat(5_000_001))).toThrow("5 MB");
  });
});
