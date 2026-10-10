import { z } from "zod";
import { dateKey, emptyState, ensureDailyQuestsState } from "./engine";
import { EXPENSE_CATEGORIES, QUEST_CATEGORIES, type AppState } from "./types";

export const PERSONAL_STORAGE_KEY = "vyloop.personal.v1";
export const BACKUP_VERSION = 1;
const amount = z.number().int().min(0).max(100_000_000_000);
const text = z.string().max(1000);
const identifier = z.string().min(1).max(200);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => dateKey(new Date(`${value}T12:00:00`)) === value,
);
const timestamp = z.string().max(100).refine((value) => Number.isFinite(Date.parse(value)));
const optionalDay = z.union([day, z.literal("")]).optional();
const stateSchema = z.object({
  profile: z.object({
    name: z.string().max(60),
    goals: z.array(z.string().max(120)).max(12),
    interests: z.array(z.string().max(120)).max(12),
    dailyMinutes: z.number().int().min(5).max(240),
    onboarded: z.boolean(),
    avatar: z.string().max(60).optional(),
  }),
  quests: z.array(z.object({
    id: identifier, title: z.string().min(1).max(120), description: text,
    category: z.enum(QUEST_CATEGORIES), difficulty: z.enum(["Easy", "Medium", "Hard"]),
    xp: z.number().int().min(0).max(100), createdAt: timestamp,
    deadline: optionalDay, isCustom: z.boolean().optional(),
    catalogKey: z.string().max(120).optional(), day: day.optional(),
  })),
  dailyQuestDays: z.array(day),
  completions: z.array(z.object({ questId: identifier, completedAt: timestamp, xp: z.number().int().min(0).max(100) })),
  expenses: z.array(z.object({
    id: identifier, title: z.string().min(1).max(120), category: z.enum(EXPENSE_CATEGORIES),
    amountPaise: amount, date: day, note: text.optional(),
  })),
  budgetPaise: amount,
  budgets: z.record(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), amount),
  goals: z.array(z.object({
    id: identifier, title: z.string().min(1).max(120), targetPaise: amount.refine((v) => v > 0),
    targetDate: optionalDay, contributions: z.array(z.object({ id: identifier, amountPaise: amount.refine((v) => v > 0), date: timestamp })),
  })),
  xpEvents: z.array(z.object({ id: identifier, key: z.string().min(1).max(250), amount: z.number().int().min(0).max(100), date: timestamp })),
  theme: z.enum(["dark", "light", "system"]),
});

export function createPersonalState(now = new Date()): AppState {
  return ensureDailyQuestsState(emptyState(), now);
}

export function parsePersonalState(value: unknown): AppState {
  const parsed = stateSchema.safeParse(value);
  if (!parsed.success) throw new Error("This file does not contain a valid VYLOOP personal backup.");
  const state = parsed.data;
  if (state.profile.onboarded && !state.profile.name.trim())
    throw new Error("The backup is missing a profile name.");
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (![state.quests.map((v) => v.id), state.expenses.map((v) => v.id),
    state.goals.map((v) => v.id), state.completions.map((v) => v.questId),
    state.xpEvents.map((v) => v.key)].every(unique))
    throw new Error("The backup contains duplicate records.");
  if (state.completions.some((c) => !state.quests.some((q) => q.id === c.questId)))
    throw new Error("The backup contains incomplete quest history.");
  return {
    ...state, profile: { ...state.profile, shareActivity: false }, squads: [],
    budgetPaise: state.budgets[dateKey().slice(0, 7)] ?? 0,
  };
}

export function parsePersonalBackup(json: string): AppState {
  if (json.length > 5_000_000) throw new Error("Choose a backup smaller than 5 MB.");
  let value;
  try { value = JSON.parse(json); } catch { throw new Error("Choose a valid VYLOOP JSON backup."); }
  if (value?.formatVersion !== BACKUP_VERSION || value?.mode !== "personal")
    throw new Error("Choose a backup exported from the personal version of VYLOOP.");
  return parsePersonalState(value);
}

export function readPersonalSnapshot(getStorage: () => Pick<Storage, "getItem">) {
  try {
    const raw = getStorage().getItem(PERSONAL_STORAGE_KEY);
    return { state: raw ? ensureDailyQuestsState(parsePersonalState(JSON.parse(raw))) : createPersonalState(), warning: null, canPersist: true };
  } catch {
    return {
      state: createPersonalState(), canPersist: false,
      warning: "Your saved records could not be read. They have been left unchanged. Restore a backup or explicitly delete this browser’s data in Settings to start again.",
    };
  }
}
