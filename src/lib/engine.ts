import {
  AppState,
  Achievement,
  Completion,
  Expense,
  SavingsGoal,
  Skill,
  QuestInput,
  Profile,
  GoalInput,
  QUEST_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "./types";
export { QUEST_CATEGORIES, EXPENSE_CATEGORIES } from "./types";
export const DIFFICULTY_XP = { Easy: 40, Medium: 60, Hard: 100 } as const;
export const STORAGE_KEY = "vyloop.demo.v1";
export const DAILY_CATALOG = [
  {
    key: "build",
    title: "Build something for 30 minutes",
    description:
      "Open your editor and make one small thing better. Progress beats perfection.",
    category: "Coding & Technology",
    difficulty: "Medium",
    xp: 60,
  },
  {
    key: "move",
    title: "Move your body",
    description:
      "Take a walk, stretch, or get a short workout in. Make it your own.",
    category: "Fitness",
    difficulty: "Easy",
    xp: 40,
  },
  {
    key: "read",
    title: "Read 10 pages",
    description:
      "A little curiosity goes a long way. Pick up that book you started.",
    category: "Learning",
    difficulty: "Easy",
    xp: 40,
  },
  {
    key: "budget",
    title: "Give your budget a check-in",
    description: "Review your spending and plan your next week with intention.",
    category: "Financial Literacy",
    difficulty: "Easy",
    xp: 40,
  },
  {
    key: "focus",
    title: "Make room for deep work",
    description:
      "Put your phone away and focus on a single task for 25 minutes.",
    category: "Productivity",
    difficulty: "Medium",
    xp: 60,
  },
  {
    key: "create",
    title: "Create just for fun",
    description:
      "Sketch, write, play, or make something without worrying about the result.",
    category: "Creativity",
    difficulty: "Medium",
    xp: 60,
  },
] as const;
export const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const rewardDay = (date = new Date()) => date.toISOString().slice(0, 10);
function shiftDay(date: Date, offset: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
}
export function parseMoney(value: string): number {
  const cleaned = value.trim().replace(/[₹,\s]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned))
    throw new Error("Enter a valid amount with up to two decimal places.");
  const [whole, fraction = ""] = cleaned.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 100_000_000_000)
    throw new Error("Amount is too large.");
  return amount;
}
export function formatMoney(amountPaise: number, compact = false): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amountPaise % 100 ? 2 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(amountPaise / 100);
}
export function validateMoney(amount: number, positive = false) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < (positive ? 1 : 0) ||
    amount > 100_000_000_000
  )
    throw new Error(
      positive
        ? "Enter an amount greater than zero."
        : "Enter a valid nonnegative amount.",
    );
}
export function totalXP(state: Pick<AppState, "xpEvents">): number {
  return state.xpEvents.reduce((sum, event) => sum + event.amount, 0);
}
export function levelInfo(xp: number) {
  const safe = Math.max(0, Math.floor(xp));
  return {
    level: Math.floor(safe / 500) + 1,
    currentXP: safe % 500,
    nextLevelXP: 500,
    progress: ((safe % 500) / 500) * 100,
    totalXP: safe,
  };
}
export function streak(completions: Completion[], now = new Date()): number {
  const days = new Set(
    completions.map((c) => dateKey(new Date(c.completedAt))),
  );
  let cursor = days.has(dateKey(now)) ? now : shiftDay(now, -1),
    count = 0;
  while (days.has(dateKey(cursor))) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}
export function longestStreak(completions: Completion[]): number {
  const dates = [
    ...new Set(completions.map((c) => dateKey(new Date(c.completedAt)))),
  ].sort();
  let longest = 0,
    run = 0,
    previous = "";
  for (const day of dates) {
    run =
      previous && dateKey(shiftDay(new Date(`${previous}T12:00:00`), 1)) === day
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return longest;
}
export function monthlySpending(expenses: Expense[], now = new Date()): number {
  const key = dateKey(now).slice(0, 7);
  return expenses
    .filter((e) => e.date.slice(0, 7) === key)
    .reduce((sum, e) => sum + e.amountPaise, 0);
}
export function budgetSummary(
  state: Pick<AppState, "expenses" | "budgetPaise"> &
    Partial<Pick<AppState, "budgets">>,
  now = new Date(),
) {
  const spent = monthlySpending(state.expenses, now),
    key = dateKey(now).slice(0, 7),
    budget = state.budgets ? (state.budgets[key] ?? 0) : state.budgetPaise;
  return {
    budget,
    spent,
    remaining: budget - spent,
    percentage: budget ? (spent / budget) * 100 : 0,
  };
}
export function savingsTotal(goal: SavingsGoal): number {
  return goal.contributions.reduce((sum, c) => sum + c.amountPaise, 0);
}
export function categoryTotals(expenses: Expense[], now = new Date()) {
  const key = dateKey(now).slice(0, 7);
  return EXPENSE_CATEGORIES.map((category) => ({
    category,
    amountPaise: expenses
      .filter((e) => e.category === category && e.date.startsWith(key))
      .reduce((sum, e) => sum + e.amountPaise, 0),
  })).filter((c) => c.amountPaise > 0);
}
export function monthlyTrends(expenses: Expense[], now = new Date()) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      key: dateKey(d).slice(0, 7),
      amountPaise: monthlySpending(expenses, d),
    };
  });
}
export function weeklyActivity(completions: Completion[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = shiftDay(now, i - 6),
      key = dateKey(d),
      items = completions.filter(
        (c) => dateKey(new Date(c.completedAt)) === key,
      );
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: key,
      count: items.length,
      xp: items.reduce((s, c) => s + c.xp, 0),
    };
  });
}
export function validateQuest(input: QuestInput) {
  if (!input.title.trim() || input.title.trim().length > 120)
    throw new Error("Quest titles must be between 1 and 120 characters.");
  if (!QUEST_CATEGORIES.includes(input.category))
    throw new Error("Choose a valid category.");
  if (!(input.difficulty in DIFFICULTY_XP))
    throw new Error("Choose a valid difficulty.");
  if (input.description.length > 1000)
    throw new Error("Keep descriptions under 1,000 characters.");
  if (input.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline))
    throw new Error("Choose a valid deadline.");
}
export function completeQuestState(
  state: AppState,
  questId: string,
  now = new Date(),
): AppState {
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest) throw new Error("Quest not found.");
  if (quest.day && quest.day !== rewardDay(now))
    throw new Error(
      "This daily quest has expired. Your new daily quests are ready after refreshing.",
    );
  const key = `quest:${questId}`;
  if (
    state.completions.some((c) => c.questId === questId) ||
    state.xpEvents.some((e) => e.key === key)
  )
    throw new Error("You have already completed this quest.");
  const xp = Math.min(100, Math.max(0, quest.xp));
  const date = now.toISOString();
  const dailyXP = state.completions
    .filter((c) => rewardDay(new Date(c.completedAt)) === rewardDay(now))
    .reduce((sum, c) => sum + c.xp, 0);
  if (dailyXP + xp > 500)
    throw new Error("Daily quest XP limit is 500. Come back tomorrow.");
  return {
    ...state,
    completions: [...state.completions, { questId, completedAt: date, xp }],
    xpEvents: [...state.xpEvents, { id: id(), key, amount: xp, date }],
  };
}
export function contributeState(
  state: AppState,
  goalId: string,
  amountPaise: number,
  now = new Date(),
): AppState {
  validateMoney(amountPaise, true);
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) throw new Error("Savings goal not found.");
  const date = now.toISOString(),
    updated = {
      ...goal,
      contributions: [...goal.contributions, { id: id(), amountPaise, date }],
    };
  const total = savingsTotal(updated);
  validateMoney(total);
  const events = [...state.xpEvents];
  let dailySavingsXP = events
    .filter(
      (e) =>
        e.key.startsWith("savings:") &&
        rewardDay(new Date(e.date)) === rewardDay(now),
    )
    .reduce((sum, e) => sum + e.amount, 0);
  for (const milestone of [25, 50, 100]) {
    const key = `savings:${goalId}:${milestone}`;
    if (
      total * 100 >= goal.targetPaise * milestone &&
      !events.some((e) => e.key === key) &&
      dailySavingsXP + 80 <= 240
    ) {
      events.push({ id: id(), key, amount: 80, date });
      dailySavingsXP += 80;
    }
  }
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === goalId ? updated : g)),
    xpEvents: events,
  };
}
export function achievements(state: AppState, now = new Date()): Achievement[] {
  const completed = state.completions.length,
    saved = state.goals.reduce((s, g) => s + savingsTotal(g), 0),
    longest = longestStreak(state.completions),
    categories = new Set(
      state.completions
        .map((c) => state.quests.find((q) => q.id === c.questId)?.category)
        .filter(Boolean),
    ).size;
  const definitions: [string, string, string, string, number, number][] = [
    [
      "first-step",
      "First Step",
      "Complete your first quest.",
      "Footprints",
      completed,
      1,
    ],
    [
      "seven-day",
      "Seven-Day Explorer",
      "Complete a quest for seven consecutive days.",
      "Flame",
      longest,
      7,
    ],
    [
      "budget-beginner",
      "Budget Beginner",
      "Set a budget and record your first expense.",
      "Wallet",
      state.budgetPaise > 0 ? Math.min(1, state.expenses.length) : 0,
      1,
    ],
    [
      "savings-starter",
      "Savings Starter",
      "Make your first savings contribution.",
      "PiggyBank",
      saved > 0 ? 1 : 0,
      1,
    ],
    [
      "consistency",
      "Consistency Champion",
      "Build a 30-day quest streak.",
      "CalendarDays",
      longest,
      30,
    ],
    [
      "skill-builder",
      "Skill Builder",
      "Complete quests in three categories.",
      "GitBranch",
      categories,
      3,
    ],
    [
      "quest-master",
      "Quest Master",
      "Complete 50 personal growth quests.",
      "Trophy",
      completed,
      50,
    ],
    [
      "money-master",
      "Money Master",
      "Complete a savings goal.",
      "Gem",
      state.goals.some((g) => savingsTotal(g) >= g.targetPaise) ? 1 : 0,
      1,
    ],
  ];
  return definitions.map(
    ([aid, title, description, icon, progress, target]) => {
      const unlocked = progress >= target;
      let earnedAt: string | undefined;
      if (unlocked) {
        if (aid === "first-step")
          earnedAt = state.completions.map((c) => c.completedAt).sort()[0];
        else if (aid === "quest-master")
          earnedAt = state.completions.map((c) => c.completedAt).sort()[49];
        else if (aid === "savings-starter")
          earnedAt = state.goals
            .flatMap((g) => g.contributions.map((c) => c.date))
            .sort()[0];
        else if (aid === "budget-beginner")
          earnedAt = state.expenses.map((e) => e.date).sort()[0];
        else earnedAt = achievementDate(state, aid) ?? dateKey(now);
      }
      return {
        id: aid,
        title,
        description,
        icon,
        progress: Math.min(progress, target),
        target,
        unlocked,
        earnedAt,
      };
    },
  );
}
function achievementDate(state: AppState, key: string): string | undefined {
  if (key === "seven-day" || key === "consistency") {
    const target = key === "seven-day" ? 7 : 30;
    const sorted = [...state.completions].sort((a, b) =>
      a.completedAt.localeCompare(b.completedAt),
    );
    for (let i = 0; i < sorted.length; i++)
      if (
        streak(sorted.slice(0, i + 1), new Date(sorted[i].completedAt)) >=
        target
      )
        return sorted[i].completedAt;
  }
  if (key === "skill-builder") {
    const seen = new Set();
    for (const c of [...state.completions].sort((a, b) =>
      a.completedAt.localeCompare(b.completedAt),
    )) {
      const cat = state.quests.find((q) => q.id === c.questId)?.category;
      if (cat) seen.add(cat);
      if (seen.size >= 3) return c.completedAt;
    }
  }
  if (key === "money-master") {
    return state.goals
      .flatMap((g) => {
        let total = 0;
        return [...g.contributions]
          .sort((a, b) => a.date.localeCompare(b.date))
          .flatMap((c) => {
            total += c.amountPaise;
            return total >= g.targetPaise ? [c.date] : [];
          });
      })
      .sort()[0];
  }
  return undefined;
}
export function skills(state: AppState): Skill[] {
  const branches: [string, string[], string[]][] = [
    [
      "Technology",
      ["Coding & Technology"],
      ["Hello, world", "Builder mindset", "Ship something"],
    ],
    [
      "Finance",
      ["Financial Literacy"],
      ["Money basics", "Budget architect", "Financial fluency"],
    ],
    [
      "Health",
      ["Fitness"],
      ["Show up", "Find your rhythm", "Stronger every day"],
    ],
    [
      "Productivity",
      ["Productivity", "Personal Development"],
      ["Focused start", "Deep work", "Make it a habit"],
    ],
    [
      "Creativity",
      ["Creativity", "Learning"],
      ["Stay curious", "Creative practice", "Create your own"],
    ],
  ];
  return branches.flatMap(([branch, categories, titles]) => {
    const count = state.completions.filter((c) =>
      categories.includes(
        state.quests.find((q) => q.id === c.questId)?.category ?? "",
      ),
    ).length;
    return titles.map((title, index) => ({
      id: `${branch.toLowerCase()}-${index}`,
      branch,
      title,
      description: `Complete ${[1, 5, 12][index]} ${branch.toLowerCase()} quests to unlock this skill.`,
      required: [1, 5, 12][index],
      progress: Math.min(count, [1, 5, 12][index]),
      unlocked: count >= [1, 5, 12][index],
    }));
  });
}
export function emptyState(name = ""): AppState {
  return {
    profile: {
      name,
      goals: [],
      interests: [],
      dailyMinutes: 30,
      onboarded: false,
      shareActivity: false,
      avatar: "violet",
    },
    quests: [],
    dailyQuestDays: [],
    completions: [],
    expenses: [],
    budgetPaise: 0,
    budgets: {},
    goals: [],
    xpEvents: [],
    theme: "dark",
    squads: [],
  };
}
export function ensureDailyQuestsState(
  state: AppState,
  now = new Date(),
): AppState {
  const day = rewardDay(now),
    generatedDays = state.dailyQuestDays ?? [];
  const completed = new Set(state.completions.map((c) => c.questId));
  const retained = state.quests.filter(
    (q) => !q.day || q.day === day || completed.has(q.id),
  );
  if (generatedDays.includes(day))
    return retained.length === state.quests.length
      ? state
      : { ...state, quests: retained };
  const daily = DAILY_CATALOG.map(({ key, ...quest }) => ({
    ...quest,
    id: `daily:${day}:${key}`,
    createdAt: now.toISOString(),
    isCustom: false,
    catalogKey: key,
    day,
  }));
  return {
    ...state,
    quests: [...daily, ...retained],
    dailyQuestDays: [...generatedDays, day],
  };
}
export function updateDemoProfileState(
  state: AppState,
  changes: Partial<Profile>,
): AppState {
  const profile = {
    ...state.profile,
    ...changes,
    ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
  };
  return {
    ...state,
    profile,
    squads:
      changes.name === undefined
        ? state.squads
        : state.squads.map((s) => ({
            ...s,
            members: s.members.map((m) =>
              m.id === "demo-user" ? { ...m, name: profile.name } : m,
            ),
          })),
  };
}
export function finishOnboardingState(
  state: AppState,
  profile: Partial<Profile>,
  budgetPaise?: number,
  goal?: GoalInput,
  now = new Date(),
): AppState {
  const nextProfile = { ...state.profile, ...profile, onboarded: true };
  if (!nextProfile.name.trim() || nextProfile.name.trim().length > 60)
    throw new Error("Display name must be between 1 and 60 characters.");
  if (
    !Number.isInteger(nextProfile.dailyMinutes) ||
    nextProfile.dailyMinutes < 5 ||
    nextProfile.dailyMinutes > 240
  )
    throw new Error("Daily time should be between 5 and 240 minutes.");
  for (const values of [nextProfile.goals, nextProfile.interests])
    if (
      !Array.isArray(values) ||
      values.length > 12 ||
      values.some((value) => typeof value !== "string" || value.length > 120)
    )
      throw new Error("Choose up to 12 goals and interests.");
  if (budgetPaise !== undefined) validateMoney(budgetPaise);
  if (goal) {
    if (!goal.title.trim() || goal.title.trim().length > 120)
      throw new Error("Goal title must be between 1 and 120 characters.");
    validateMoney(goal.targetPaise, true);
    if (
      goal.targetDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate) ||
        dateKey(new Date(`${goal.targetDate}T12:00:00`)) !== goal.targetDate)
    )
      throw new Error("Choose a valid target date.");
  }
  const next = updateDemoProfileState(state, {
    ...nextProfile,
    name: nextProfile.name.trim(),
  });
  if (budgetPaise !== undefined) {
    next.budgetPaise = budgetPaise;
    next.budgets = {
      ...state.budgets,
      [dateKey(now).slice(0, 7)]: budgetPaise,
    };
  }
  if (
    goal &&
    !state.goals.some(
      (existing) =>
        existing.title.trim().toLowerCase() ===
          goal.title.trim().toLowerCase() &&
        existing.targetPaise === goal.targetPaise,
    )
  )
    next.goals = [
      ...state.goals,
      { ...goal, title: goal.title.trim(), id: id(), contributions: [] },
    ];
  return next;
}
export function createDemoState(now = new Date()): AppState {
  const state = emptyState("Alex");
  state.profile = {
    ...state.profile,
    goals: ["Build better habits", "Master my money"],
    interests: ["Technology", "Health"],
    onboarded: true,
  };
  state.budgetPaise = 1_500_000;
  state.budgets[dateKey(now).slice(0, 7)] = state.budgetPaise;
  state.dailyQuestDays = [rewardDay(now)];
  state.quests = DAILY_CATALOG.map(({ key, ...quest }, index) => ({
    ...quest,
    id: `daily-${index + 1}`,
    createdAt: now.toISOString(),
    isCustom: false,
    catalogKey: key,
    day: rewardDay(now),
  }));
  for (let i = 0; i < 47; i++) {
    const day = i < 7 ? shiftDay(now, -i) : shiftDay(now, -i - 3),
      qid = `history-${i}`,
      xp = i < 7 ? 40 : 50;
    day.setHours(12, 0, 0, 0);
    state.quests.push({
      id: qid,
      title: [
        "Morning movement",
        "A little learning",
        "Focused practice",
        "Budget check-in",
        "Creative break",
      ][i % 5],
      description: "A small step recorded in your journey.",
      category: QUEST_CATEGORIES[i % QUEST_CATEGORIES.length],
      difficulty: "Easy",
      xp,
      createdAt: day.toISOString(),
    });
    state.completions.push({
      questId: qid,
      completedAt: day.toISOString(),
      xp,
    });
    state.xpEvents.push({
      id: `event-${i}`,
      key: `quest:${qid}`,
      amount: xp,
      date: day.toISOString(),
    });
  }
  const expenseData: [
    string,
    (typeof EXPENSE_CATEGORIES)[number],
    number,
    number,
  ][] = [
    ["Campus lunch", "Food", 26000, 0],
    ["Metro recharge", "Travel", 50000, 1],
    ["Notion Plus", "Subscriptions", 65000, 1],
    ["Coffee with friends", "Food", 32000, 2],
    ["Design course", "Education", 249900, 3],
    ["Weekend groceries", "Food", 193000, 4],
    ["New running shoes", "Shopping", 149900, 5],
    ["Movie night", "Entertainment", 42000, 6],
  ];
  state.expenses = expenseData.map(
    ([title, category, amountPaise, days], i) => ({
      id: `expense-${i}`,
      title,
      category,
      amountPaise,
      date: dateKey(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          Math.max(1, now.getDate() - days),
        ),
      ),
    }),
  );
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 10),
      key = dateKey(d).slice(0, 7);
    state.budgets[key] = 1_500_000;
    state.expenses.push({
      id: `past-expense-${i}`,
      title: "Monthly living expenses",
      category: "Others",
      amountPaise: [0, 1234500, 1389000, 1098000, 1465000, 1320000][i],
      date: dateKey(d),
      note: "Example historical transaction in demo mode.",
    });
  }
  state.goals = [
    {
      id: "laptop",
      title: "New laptop",
      targetPaise: 8_000_000,
      targetDate: dateKey(new Date(now.getFullYear() + 1, 0, 1)),
      contributions: [
        {
          id: "saving-1",
          amountPaise: 1_600_000,
          date: shiftDay(now, -24).toISOString(),
        },
        {
          id: "saving-2",
          amountPaise: 800_000,
          date: shiftDay(now, -3).toISOString(),
        },
      ],
    },
  ];
  state.xpEvents.push(
    {
      id: "saving-event",
      key: "savings:laptop:25",
      amount: 80,
      date: shiftDay(now, -3).toISOString(),
    },
    {
      id: "budget-event",
      key: "budget-review:initial",
      amount: 40,
      date: shiftDay(now, -5).toISOString(),
    },
  );
  state.squads = [
    {
      id: "demo-squad",
      name: "The 1% Club",
      code: "ONEPCT",
      members: [
        {
          id: "demo-user",
          name: "Alex",
          joinedAt: shiftDay(now, -10).toISOString(),
        },
      ],
      challenges: [
        {
          id: "demo-challenge",
          title: "Show up for yourself today",
          target: 1,
          completedBy: [],
        },
      ],
    },
  ];
  return state;
}
