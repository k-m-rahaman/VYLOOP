"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { saveBrowserSnapshot } from "./browser-storage";
import { BACKUP_VERSION, PERSONAL_STORAGE_KEY, createPersonalState, parsePersonalBackup, readPersonalSnapshot } from "./personal-data";
import {
  completeQuestState,
  contributeState,
  dateKey,
  DIFFICULTY_XP,
  emptyState,
  ensureDailyQuestsState,
  finishOnboardingState,
  id,
  updateDemoProfileState,
  validateMoney,
  validateQuest,
} from "./engine";
import {
  AppState,
  ExpenseInput,
  GoalInput,
  Profile,
  QuestInput,
  Theme,
  EXPENSE_CATEGORIES,
} from "./types";

interface AppContextValue extends AppState {
  data: AppState;
  state: AppState;
  ready: boolean;
  mode: "personal";
  loadError: string | null;
  storageWarning: string | null;
  completeQuest: (questId: string) => Promise<void>;
  addQuest: (input: QuestInput) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  saveExpense: (input: ExpenseInput) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  setBudget: (amountPaise: number, month?: string) => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  editGoal: (goalId: string, input: Partial<GoalInput>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  contribute: (goalId: string, amountPaise: number) => Promise<void>;
  updateProfile: (input: Partial<Profile>) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  importData: (json: string) => Promise<void>;
  exportData: () => string;
  deleteData: () => Promise<void>;
  finishOnboarding: (
    profile: Partial<Profile>,
    budgetPaise?: number,
    goal?: GoalInput,
  ) => Promise<void>;
  reload: () => Promise<void>;
}
const AppContext = createContext<AppContextValue | null>(null);
const fail = (message: string): never => {
  throw new Error(message);
};
function assertText(value: string, label: string, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(`${label} must be between 1 and ${max} characters.`);
}
function validDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    dateKey(new Date(`${value}T12:00:00`)) !== value
  )
    fail("Choose a valid date.");
}
function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vyloop-theme", theme);
  } catch {
    /* Continue with an in-memory preference when storage is unavailable. */
  }
  document.documentElement.dataset.theme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyState());
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const localSaveAllowed = useRef(false);
  const mode = "personal" as const;
  const replace = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const local = readPersonalSnapshot(() => localStorage);
      localSaveAllowed.current = local.canPersist;
      setStorageWarning(local.warning);
      replace(local.state);
      applyTheme(local.state.theme);
      setReady(true);
    });
    return () => { active = false; };
  }, [replace]);
  useEffect(() => {
    if (ready && localSaveAllowed.current) {
      const warning = saveBrowserSnapshot(() => localStorage, PERSONAL_STORAGE_KEY, state);
      queueMicrotask(() => setStorageWarning(warning));
    }
  }, [state, ready]);
  useEffect(() => {
    if (!ready) return;
    applyTheme(state.theme);
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      if (stateRef.current.theme === "system") applyTheme("system");
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [state.theme, ready]);
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (document.visibilityState !== "hidden")
        replace(ensureDailyQuestsState(stateRef.current));
    };
    const interval = window.setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", check); };
  }, [ready, replace]);
  const completeQuest = async (questId: string) => {
    
    replace(completeQuestState(stateRef.current, questId));
  };
  const addQuest = async (input: QuestInput) => {
    validateQuest(input);
    const xp = DIFFICULTY_XP[input.difficulty];
    
    replace({
      ...stateRef.current,
      quests: [
        ...stateRef.current.quests,
        {
          ...input,
          id: id(),
          title: input.title.trim(),
          xp,
          isCustom: true,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };
  const deleteQuest = async (questId: string) => {
    
    const current = stateRef.current;
    if (current.completions.some((c) => c.questId === questId))
      fail("Completed quests stay in your activity history.");
    replace({
      ...current,
      quests: current.quests.filter((q) => q.id !== questId),
    });
  };
  const saveExpense = async (input: ExpenseInput) => {
    assertText(input.title, "Expense title");
    validateMoney(input.amountPaise, true);
    validDate(input.date);
    if (!EXPENSE_CATEGORIES.includes(input.category))
      fail("Choose a valid category.");
    if ((input.note?.length ?? 0) > 1000)
      fail("Keep notes under 1,000 characters.");
    
    const current = stateRef.current;
    if (input.id && !current.expenses.some((e) => e.id === input.id))
      fail("Expense not found.");
    const item = { ...input, id: input.id ?? id(), title: input.title.trim() };
    replace({
      ...current,
      expenses: input.id
        ? current.expenses.map((e) => (e.id === input.id ? item : e))
        : [item, ...current.expenses],
    });
  };
  const deleteExpense = async (expenseId: string) => {
    
    replace({
      ...stateRef.current,
      expenses: stateRef.current.expenses.filter((e) => e.id !== expenseId),
    });
  };
  const setBudget = async (
    amountPaise: number,
    month = dateKey().slice(0, 7),
  ) => {
    validateMoney(amountPaise);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      fail("Choose a valid budget month.");
    
    const current = stateRef.current;
    replace({
      ...current,
      budgetPaise:
        month === dateKey().slice(0, 7) ? amountPaise : current.budgetPaise,
      budgets: { ...current.budgets, [month]: amountPaise },
    });
  };
  const addGoal = async (input: GoalInput) => {
    assertText(input.title, "Goal title");
    validateMoney(input.targetPaise, true);
    if (input.targetDate) validDate(input.targetDate);
    
    replace({
      ...stateRef.current,
      goals: [
        ...stateRef.current.goals,
        { ...input, title: input.title.trim(), id: id(), contributions: [] },
      ],
    });
  };
  const editGoal = async (goalId: string, input: Partial<GoalInput>) => {
    if (input.title !== undefined) assertText(input.title, "Goal title");
    if (input.targetPaise !== undefined) validateMoney(input.targetPaise, true);
    if (input.targetDate) validDate(input.targetDate);
    
    if (!stateRef.current.goals.some((g) => g.id === goalId))
      fail("Savings goal not found.");
    replace({
      ...stateRef.current,
      goals: stateRef.current.goals.map((g) =>
        g.id === goalId ? { ...g, ...input } : g,
      ),
    });
  };
  const deleteGoal = async (goalId: string) => {
    
    replace({
      ...stateRef.current,
      goals: stateRef.current.goals.filter((g) => g.id !== goalId),
    });
  };
  const contribute = async (goalId: string, amountPaise: number) => {
    validateMoney(amountPaise, true);
    
    replace(contributeState(stateRef.current, goalId, amountPaise));
  };
  const updateProfile = async (input: Partial<Profile>) => {
    if (input.name !== undefined) assertText(input.name, "Display name", 60);
    if (
      input.dailyMinutes !== undefined &&
      (!Number.isInteger(input.dailyMinutes) ||
        input.dailyMinutes < 5 ||
        input.dailyMinutes > 240)
    )
      fail("Daily time should be between 5 and 240 minutes.");
    if (
      input.goals &&
      (!Array.isArray(input.goals) ||
        input.goals.length > 12 ||
        input.goals.some((g) => typeof g !== "string" || g.length > 120))
    )
      fail("Choose up to 12 goals.");
    if (
      input.interests &&
      (!Array.isArray(input.interests) ||
        input.interests.length > 12 ||
        input.interests.some((g) => typeof g !== "string" || g.length > 120))
    )
      fail("Choose up to 12 interests.");
    
    replace(updateDemoProfileState(stateRef.current, input));
  };
  const finishOnboarding = async (
    profile: Partial<Profile>,
    budgetPaise?: number,
    goal?: GoalInput,
  ) => {
    const next = finishOnboardingState(
      stateRef.current,
      profile,
      budgetPaise,
      goal,
    );
    
    replace(next);
  };
  const setTheme = async (theme: Theme) => {
    if (!["dark", "light", "system"].includes(theme))
      fail("Choose a valid theme.");
    applyTheme(theme);
    
    replace({ ...stateRef.current, theme });
  };
  const importData = async (json: string) => {
    const next = ensureDailyQuestsState(parsePersonalBackup(json));
    const warning = saveBrowserSnapshot(() => localStorage, PERSONAL_STORAGE_KEY, next);
    if (warning) throw new Error("The backup was valid, but this browser cannot save it. Your current records have not been replaced.");
    localSaveAllowed.current = true;
    setStorageWarning(null);
    replace(next);
  };
  const exportData = () => {
    const json = JSON.stringify(
      { formatVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), mode, ...stateRef.current },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `vyloop-${mode}-${dateKey()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return json;
  };
  const deleteData = async () => {
    try { localStorage.removeItem(PERSONAL_STORAGE_KEY); }
    catch { throw new Error("This browser could not delete saved records. Try clearing VYLOOP site data in your browser settings."); }
    localSaveAllowed.current = true;
    setStorageWarning(null);
    replace(createPersonalState());
  };
  const reload = async () => {
    replace(ensureDailyQuestsState(stateRef.current));
  };
  return (
    <AppContext.Provider
      value={{
        ...state,
        state,
        data: state,
        ready,
        mode,
        loadError: null,
        storageWarning,
        completeQuest,
        addQuest,
        deleteQuest,
        saveExpense,
        deleteExpense,
        setBudget,
        addGoal,
        editGoal,
        deleteGoal,
        contribute,
        updateProfile,
        finishOnboarding,
        setTheme,
        importData,
        exportData,
        deleteData,
        reload,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
