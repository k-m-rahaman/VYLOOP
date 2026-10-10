import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  achievements,
  budgetSummary,
  completeQuestState,
  contributeState,
  createDemoState,
  dateKey,
  emptyState,
  ensureDailyQuestsState,
  finishOnboardingState,
  formatMoney,
  levelInfo,
  longestStreak,
  monthlySpending,
  monthlyTrends,
  parseMoney,
  savingsTotal,
  skills,
  streak,
  totalXP,
  updateDemoProfileState,
  validateMoney,
  weeklyActivity,
} from "./engine";
import type { Completion, Expense } from "./types";
const now = new Date("2026-10-09T12:00:00");
const completion = (day: string): Completion => ({
  questId: day,
  completedAt: `${day}T12:00:00`,
  xp: 40,
});

describe("exact financial values", () => {
  it("parses paise without floating-point multiplication errors", () => {
    expect(parseMoney("0.29")).toBe(29);
    expect(parseMoney("₹1,500.01")).toBe(150001);
    expect(parseMoney("0.10") + parseMoney("0.20")).toBe(30);
    expect(parseMoney("12")).toBe(1200);
  });
  it.each([
    "-1",
    "1.001",
    "1e3",
    "Infinity",
    "NaN",
    "1.2.3",
    "",
    ".50",
    "1000000001",
  ])("rejects invalid currency %s", (value) =>
    expect(() => parseMoney(value)).toThrow(),
  );
  it("requires safe nonnegative integer paise", () => {
    expect(() => validateMoney(1.1)).toThrow();
    expect(() => validateMoney(-1)).toThrow();
    expect(() => validateMoney(0, true)).toThrow();
    expect(() => validateMoney(0)).not.toThrow();
  });
  it("formats INR and negative remaining balances", () => {
    expect(formatMoney(150000)).toBe("₹1,500");
    expect(formatMoney(-50025)).toContain("-₹500.25");
  });
  it("filters by full month including year and preserves overspending", () => {
    const expenses: Expense[] = [
      {
        id: "a",
        title: "Lunch",
        category: "Food",
        amountPaise: 20000,
        date: "2026-10-09",
      },
      {
        id: "b",
        title: "Prior year",
        category: "Food",
        amountPaise: 90000,
        date: "2025-10-09",
      },
      {
        id: "c",
        title: "Prior month",
        category: "Food",
        amountPaise: 10000,
        date: "2026-09-30",
      },
    ];
    expect(monthlySpending(expenses, now)).toBe(20000);
    expect(budgetSummary({ expenses, budgetPaise: 10000 }, now)).toEqual({
      budget: 10000,
      spent: 20000,
      remaining: -10000,
      percentage: 200,
    });
  });
  it("uses historical budgets and never invents a missing month budget", () => {
    const state = emptyState();
    state.budgetPaise = 50000;
    state.budgets = { "2026-10": 50000, "2026-09": 25000 };
    expect(budgetSummary(state, new Date("2026-09-15T12:00:00")).budget).toBe(
      25000,
    );
    expect(budgetSummary(state, new Date("2026-08-15T12:00:00")).budget).toBe(
      0,
    );
  });
  it("produces continuous analytics months over year boundaries", () => {
    const trends = monthlyTrends([], new Date("2026-02-28T12:00:00"));
    expect(trends.map((t) => t.key)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});
describe("unified progression", () => {
  it("creates six daily catalog quests exactly once without granting XP", () => {
    const state = ensureDailyQuestsState(emptyState(), now);
    expect(state.quests).toHaveLength(6);
    expect(new Set(state.quests.map((q) => q.category)).size).toBe(6);
    expect(
      state.quests.every(
        (q) => q.isCustom === false && q.xp <= 60 && q.day === "2026-10-09",
      ),
    ).toBe(true);
    expect(totalXP(state)).toBe(0);
    expect(state.completions).toHaveLength(0);
    expect(ensureDailyQuestsState(state, now)).toBe(state);
  });
  it("does not resurrect deleted daily quests during same-day reloads", () => {
    const generated = ensureDailyQuestsState(emptyState(), now);
    const deleted = { ...generated, quests: [] };
    expect(ensureDailyQuestsState(deleted, now).quests).toHaveLength(0);
    expect(deleted.dailyQuestDays).toEqual(["2026-10-09"]);
  });
  it("refreshes the next day, retains completed history, and expires uncompleted catalog quests", () => {
    let state = ensureDailyQuestsState(emptyState(), now);
    const firstId = state.quests[0].id;
    state = completeQuestState(state, firstId, now);
    const next = ensureDailyQuestsState(state, new Date("2026-10-10T12:00:00"));
    expect(next.quests).toHaveLength(7);
    expect(next.quests.find((q) => q.id === firstId)).toBeDefined();
    expect(next.completions).toHaveLength(1);
    expect(totalXP(next)).toBe(60);
    expect(next.quests.filter((q) => q.day === "2026-10-10")).toHaveLength(6);
    expect(() =>
      completeQuestState(
        state,
        state.quests[1].id,
        new Date("2026-10-10T12:00:00"),
      ),
    ).toThrow(/expired/);
  });
  it("keeps the existing demo seed intact on initial catalog refresh", () => {
    const state = createDemoState(now);
    expect(ensureDailyQuestsState(state, now)).toBe(state);
    expect(totalXP(state)).toBe(2400);
    expect(state.quests.filter((q) => q.day === "2026-10-09")).toHaveLength(6);
  });
  it("centralizes level boundaries", () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, currentXP: 0, progress: 0 });
    expect(levelInfo(499)).toMatchObject({ level: 1, currentXP: 499 });
    expect(levelInfo(500)).toMatchObject({ level: 2, currentXP: 0 });
    expect(levelInfo(2400)).toMatchObject({
      level: 5,
      currentXP: 400,
      progress: 80,
    });
  });
  it("atomically creates exactly one completion and one reward event", () => {
    const state = createDemoState(now),
      next = completeQuestState(state, "daily-1", now);
    expect(next.completions.length).toBe(state.completions.length + 1);
    expect(totalXP(next) - totalXP(state)).toBe(60);
    expect(() => completeQuestState(next, "daily-1", now)).toThrow(/already/);
    expect(state.completions.length).toBe(47);
  });
  it("rejects a ledger duplicate even if a completion is missing", () => {
    const state = createDemoState(now);
    state.xpEvents.push({
      id: "existing",
      key: "quest:daily-1",
      amount: 60,
      date: now.toISOString(),
    });
    expect(() => completeQuestState(state, "daily-1", now)).toThrow(/already/);
  });
  it("rejects unknown quests and caps daily quest rewards", () => {
    const state = createDemoState(now);
    expect(() => completeQuestState(state, "unknown", now)).toThrow(
      /not found/,
    );
    state.completions.push({
      questId: "previous",
      completedAt: now.toISOString(),
      xp: 450,
    });
    expect(() => completeQuestState(state, "daily-1", now)).toThrow(/Daily/);
  });
  it("resets the reward cap at UTC midnight consistently with the backend", () => {
    const state = emptyState();
    state.quests = [
      {
        id: "new",
        title: "Focus",
        description: "A task",
        category: "Productivity",
        difficulty: "Easy",
        xp: 40,
        createdAt: "2026-10-08T23:00:00Z",
      },
    ];
    state.completions = [
      { questId: "previous", completedAt: "2026-10-08T23:59:59Z", xp: 500 },
    ];
    expect(() =>
      completeQuestState(state, "new", new Date("2026-10-09T00:00:00Z")),
    ).not.toThrow();
    expect(() =>
      completeQuestState(state, "new", new Date("2026-10-08T23:59:59Z")),
    ).toThrow(/Daily/);
  });
  it("counts consecutive calendar days with same-day duplicates only once", () => {
    const list = ["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-09"].map(
      completion,
    );
    expect(streak(list, now)).toBe(3);
    expect(longestStreak(list)).toBe(3);
  });
  it("keeps yesterday streak active and breaks after a gap", () => {
    expect(streak(["2026-10-07", "2026-10-08"].map(completion), now)).toBe(2);
    expect(streak(["2026-10-06", "2026-10-07"].map(completion), now)).toBe(0);
    expect(streak(["2026-10-07", "2026-10-09"].map(completion), now)).toBe(1);
  });
  it("tracks consecutive days across a month boundary", () => {
    expect(
      streak(
        ["2026-09-29", "2026-09-30", "2026-10-01"].map(completion),
        new Date("2026-10-01T12:00:00"),
      ),
    ).toBe(3);
  });
  it("weekly activity is derived only from completions", () => {
    const list = ["2026-10-02", "2026-10-03", "2026-10-09"].map(completion);
    const week = weeklyActivity(list, now);
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-10-03");
    expect(week.reduce((s, d) => s + d.count, 0)).toBe(2);
    expect(week.reduce((s, d) => s + d.xp, 0)).toBe(80);
  });
});
describe("savings and actual achievements", () => {
  it("allows seeded demo onboarding customization without duplicate optional goals", () => {
    const seeded = createDemoState(now);
    const goal = { title: "Headphones", targetPaise: 200000 };
    const first = finishOnboardingState(
      seeded,
      { name: "Taylor" },
      undefined,
      goal,
      now,
    );
    const second = finishOnboardingState(
      first,
      { name: "Taylor" },
      undefined,
      { ...goal, title: " headphones " },
      now,
    );
    expect(first.goals).toHaveLength(2);
    expect(second.goals).toHaveLength(2);
    expect(first.squads[0].members[0].name).toBe("Taylor");
  });
  it("keeps demo squad display names synchronized with profile edits", () => {
    const state = updateDemoProfileState(createDemoState(now), {
      name: " Taylor ",
    });
    expect(state.profile.name).toBe("Taylor");
    expect(state.squads[0].members[0].name).toBe("Taylor");
  });
  it("finishes onboarding atomically and never adds a goal twice on retry", () => {
    const initial = emptyState();
    const goal = { title: "Laptop", targetPaise: 1000000 };
    const completed = finishOnboardingState(
      initial,
      { name: "Taylor" },
      500000,
      goal,
      now,
    );
    expect(completed.profile.onboarded).toBe(true);
    expect(completed.budgets["2026-10"]).toBe(500000);
    expect(completed.goals).toHaveLength(1);
    const replay = finishOnboardingState(
      completed,
      { name: "Taylor" },
      500000,
      goal,
      now,
    );
    expect(replay.goals).toHaveLength(1);
    expect(replay.goals[0].id).toBe(completed.goals[0].id);
    expect(initial.profile.onboarded).toBe(false);
    expect(initial.goals).toHaveLength(0);
  });
  it("does not partially save onboarding when an optional goal is invalid", () => {
    const initial = emptyState();
    expect(() =>
      finishOnboardingState(
        initial,
        { name: "Taylor" },
        500000,
        { title: "Laptop", targetPaise: -1 },
        now,
      ),
    ).toThrow();
    expect(initial.profile.name).toBe("");
    expect(initial.budgets).toEqual({});
    expect(initial.goals).toHaveLength(0);
  });
  it("allows optional onboarding steps to be skipped", () => {
    const state = finishOnboardingState(
      emptyState(),
      { name: "Taylor" },
      undefined,
      undefined,
      now,
    );
    expect(state.profile.onboarded).toBe(true);
    expect(state.budgetPaise).toBe(0);
    expect(state.goals).toHaveLength(0);
  });
  it("sums exact contributions and awards each milestone once", () => {
    let state = emptyState();
    state.goals = [
      { id: "goal", title: "Course", targetPaise: 10000, contributions: [] },
    ];
    state = contributeState(state, "goal", 2500, now);
    expect(savingsTotal(state.goals[0])).toBe(2500);
    expect(totalXP(state)).toBe(80);
    state = contributeState(state, "goal", 2500, now);
    expect(totalXP(state)).toBe(160);
    state = contributeState(state, "goal", 5000, now);
    expect(totalXP(state)).toBe(240);
    state = contributeState(state, "goal", 1, now);
    expect(totalXP(state)).toBe(240);
    expect(savingsTotal(state.goals[0])).toBe(10001);
  });
  it("never rewards merely editing a goal or spending money", () => {
    const state = emptyState();
    state.goals = [
      {
        id: "goal",
        title: "Course",
        targetPaise: 10000,
        contributions: [
          { id: "c", amountPaise: 10000, date: now.toISOString() },
        ],
      },
    ];
    state.expenses = [
      {
        id: "e",
        title: "Lunch",
        category: "Food",
        amountPaise: 50000,
        date: dateKey(now),
      },
    ];
    expect(totalXP(state)).toBe(0);
  });
  it("caps daily savings milestone rewards without dropping contributions", () => {
    let state = emptyState();
    state.goals = [
      { id: "one", title: "One", targetPaise: 10000, contributions: [] },
      { id: "two", title: "Two", targetPaise: 10000, contributions: [] },
    ];
    state = contributeState(state, "one", 10000, now);
    state = contributeState(state, "two", 10000, now);
    expect(totalXP(state)).toBe(240);
    expect(savingsTotal(state.goals[1])).toBe(10000);
  });
  it("rejects non-integer or missing-goal contributions", () => {
    const state = emptyState();
    expect(() => contributeState(state, "missing", 100, now)).toThrow(
      /not found/,
    );
    expect(() => contributeState(state, "missing", 0, now)).toThrow();
    expect(() => contributeState(state, "missing", 0.1, now)).toThrow();
  });
  it("starts new accounts with no invented activity or unlocks", () => {
    const state = emptyState();
    expect(totalXP(state)).toBe(0);
    expect(state.quests).toHaveLength(0);
    expect(achievements(state, now).every((a) => !a.unlocked)).toBe(true);
    expect(skills(state).every((s) => !s.unlocked)).toBe(true);
  });
  it("derives earned first-step date and seven-day badge from stored records", () => {
    const state = createDemoState(now);
    const list = achievements(state, now);
    expect(list.find((a) => a.id === "seven-day")).toMatchObject({
      unlocked: true,
      earnedAt: expect.any(String),
    });
    expect(list.find((a) => a.id === "first-step")?.earnedAt).toBe(
      [...state.completions].map((c) => c.completedAt).sort()[0],
    );
    expect(list.find((a) => a.id === "quest-master")?.unlocked).toBe(false);
    expect(list.find((a) => a.id === "money-master")?.unlocked).toBe(false);
  });
  it("has an internally consistent demo with real seven-day activity", () => {
    const state = createDemoState(now);
    expect(totalXP(state)).toBe(2400);
    expect(streak(state.completions, now)).toBe(7);
    expect(monthlySpending(state.expenses, now)).toBe(807800);
    expect(budgetSummary(state, now).remaining).toBe(692200);
    expect(savingsTotal(state.goals[0])).toBe(2400000);
  });
});

describe("Supabase security migration contract (static inspection)", () => {
  const sql = readFileSync(
    new URL(
      "../../supabase/migrations/202610090001_vyloop.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const tables = [
    "profiles",
    "quests",
    "daily_quest_days",
    "quest_completions",
    "xp_events",
    "expenses",
    "budgets",
    "savings_goals",
    "savings_contributions",
    "squads",
    "squad_members",
    "squad_challenges",
    "squad_challenge_completions",
  ];
  it.each(tables)("enables RLS for %s", (table) =>
    expect(sql).toContain(
      `alter table public.${table} enable row level security;`,
    ),
  );
  it("scopes every monetary write to authenticated identity", () => {
    expect(sql).toContain(
      "expenses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())",
    );
    expect(sql).toContain(
      "savings_goals for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())",
    );
    expect(sql).toContain("goal_id=p_goal_id and user_id=v_uid");
    expect(sql).toContain("id=p_goal_id and user_id=v_uid for update");
  });
  it("removes anonymous access and default function execute without changing unrelated objects", () => {
    expect(sql).toMatch(/revoke all on public\.profiles[^;]*from public,anon;/);
    expect(sql).toMatch(
      /revoke execute on function public\.handle_new_user\(\)[^;]*from public,anon,authenticated;/,
    );
    expect(sql).not.toContain("on all tables in schema public");
    expect(sql).not.toContain("on all functions in schema public");
    expect(sql).toContain(
      "if v_uid is null then raise exception 'Authentication required'",
    );
  });
  it("does not grant direct reward or completion writes", () => {
    expect(sql).toContain(
      "grant insert,update,delete on public.expenses,public.savings_goals to authenticated",
    );
    expect(sql).not.toMatch(
      /grant[^;]*(insert|update|delete)[^;]*(xp_events|quest_completions)/i,
    );
    expect(sql).toContain("unique(user_id,event_key)");
    expect(sql).toContain("quest_id uuid not null unique");
  });
  it("uses owned row locks and server-calculated XP inside atomic functions", () => {
    const complete = sql.slice(
      sql.indexOf("create function public.complete_quest"),
      sql.indexOf("create function public.delete_quest"),
    );
    expect(complete).toContain("where id=v_uid for update");
    expect(complete).toContain(
      "where id=p_quest_id and user_id=v_uid for update",
    );
    expect(complete).toContain("values(v_uid,p_quest_id,v_quest.xp)");
    expect(complete).toContain("insert into public.xp_events");
    expect(complete).not.toContain("p_xp");
  });
  it("requires membership and explicit activity sharing for challenge contributions", () => {
    const complete = sql.slice(
      sql.indexOf("create function public.complete_squad_challenge"),
      sql.indexOf("create function public.get_app_state"),
    );
    expect(complete).toContain("not public.is_squad_member(v_squad)");
    expect(complete).toContain("id=v_uid and share_activity");
    expect(sql).toContain("where cc.challenge_id=c.id and cp.share_activity");
  });
  it("deletes only the authenticated account and relies on cascades", () => {
    expect(sql).toContain("delete from auth.users where id=v_uid");
    expect(sql).toContain("references auth.users(id) on delete cascade");
    expect(sql).not.toMatch(/delete_account\([^)]*p_user/i);
  });
  it("locks and atomically finishes onboarding with replay-safe optional goal creation", () => {
    const onboarding = sql.slice(
      sql.indexOf("create function public.finish_onboarding"),
      sql.indexOf("create function public.create_squad"),
    );
    expect(onboarding).toContain(
      "select onboarded into v_onboarded from public.profiles where id=v_uid for update",
    );
    expect(onboarding).toContain("perform public.update_profile");
    expect(onboarding).toContain("perform public.set_budget");
    expect(onboarding).toContain("and not v_onboarded then");
    expect(onboarding).toContain("insert into public.savings_goals");
  });
  it("generates daily quests under an owned account lock with persistent per-day idempotency", () => {
    const daily = sql.slice(
      sql.indexOf("create function public.ensure_daily_quests"),
      sql.indexOf("create function public.create_quest"),
    );
    expect(daily).toContain("where id=v_uid for update");
    expect(daily).toContain("on conflict(user_id,day) do nothing");
    expect(daily).toContain("if not found then return");
    expect(daily).not.toContain("insert into public.xp_events");
    expect(sql).toContain("unique(user_id,catalog_key,quest_day)");
    expect(sql).toContain(
      "v_quest.quest_day<>(now() at time zone 'UTC')::date",
    );
  });
  it("reveals squad completion sharing only between current members of that challenge squad", () => {
    const helper = sql.slice(
      sql.indexOf("create function public.can_view_squad_completion"),
      sql.indexOf("create policy profile_private"),
    );
    expect(helper).toContain("viewer.user_id=auth.uid()");
    expect(helper).toContain("actor.user_id=p_actor_id");
    expect(helper).toContain(
      "where c.id=p_challenge_id and actor_profile.share_activity",
    );
    expect(sql).toContain(
      "using(user_id=auth.uid() or public.can_view_squad_completion(challenge_id,user_id))",
    );
  });
});
