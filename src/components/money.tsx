"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Download,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  History,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  Train,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/lib/store";
import { escapeCsvCell } from "@/lib/csv";
import {
  budgetSummary,
  formatMoney,
  parseMoney,
  savingsTotal,
} from "@/lib/engine";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  Progress,
  SectionHeading,
} from "@/components/ui";
import "./money.css";

const categories = [
  "Food",
  "Travel",
  "Education",
  "Shopping",
  "Entertainment",
  "Subscriptions",
  "Health",
  "Others",
] as const;
type Category = (typeof categories)[number];
type Expense = {
  id: string;
  title: string;
  category: Category;
  amountPaise: number;
  date: string;
  note?: string;
};
type Goal = {
  id: string;
  title: string;
  targetPaise: number;
  targetDate?: string;
  contributions: { id: string; amountPaise: number; date: string }[];
};
const categoryAppearance = {
  Food: { icon: Utensils, color: "#f4aa6a" },
  Travel: { icon: Train, color: "#70a5f5" },
  Education: { icon: GraduationCap, color: "#a88cf5" },
  Shopping: { icon: ShoppingBag, color: "#ed8fc2" },
  Entertainment: { icon: Clapperboard, color: "#f5c76d" },
  Subscriptions: { icon: CreditCard, color: "#66d4c2" },
  Health: { icon: HeartPulse, color: "#8ccf9b" },
  Others: { icon: Ellipsis, color: "#99a6bc" },
};

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthDate(key: string) {
  return new Date(`${key}-01T12:00:00`);
}
function monthName(key: string, short = false) {
  return monthDate(key).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}
function moneyInput(paise: number) {
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}
function validMoney(value: string, allowZero = false) {
  try {
    const amount = parseMoney(value);
    return (
      Number.isSafeInteger(amount) &&
      amount >= (allowZero ? 0 : 1) &&
      amount <= 10_000_000_000
    );
  } catch {
    return false;
  }
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
function readableDate(date: string) {
  return new Date(
    date.length === 10 ? `${date}T12:00:00` : date,
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function percentage(saved: number, target: number) {
  return target > 0 ? Math.round((saved / target) * 100) : 0;
}

const expenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give this expense a name.")
    .max(80, "Keep the name under 80 characters."),
  amount: z
    .string()
    .refine(
      (value) => validMoney(value),
      "Enter an amount from ₹0.01 to ₹10,00,00,000, with up to 2 decimal places.",
    ),
  category: z.enum(categories),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
    .refine(
      (value) => value <= todayISO(),
      "An expense date cannot be in the future.",
    ),
  note: z.string().trim().max(300, "Keep your note under 300 characters."),
});
type ExpenseValues = z.infer<typeof expenseSchema>;
const goalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your goal a name.")
    .max(60, "Keep the name under 60 characters."),
  amount: z
    .string()
    .refine(
      (value) => validMoney(value),
      "Enter a positive target with up to 2 decimal places.",
    ),
  targetDate: z
    .string()
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Choose a valid target date.",
    ),
});
type GoalValues = z.infer<typeof goalSchema>;

function ExpenseForm({
  expense,
  onClose,
}: {
  expense?: Expense;
  onClose: () => void;
}) {
  const { saveExpense } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title ?? "",
      amount: expense ? moneyInput(expense.amountPaise) : "",
      category: expense?.category ?? "Food",
      date: expense?.date ?? todayISO(),
      note: expense?.note ?? "",
    },
  });
  async function submit(values: ExpenseValues) {
    try {
      await saveExpense({
        id: expense?.id,
        title: values.title,
        category: values.category,
        amountPaise: parseMoney(values.amount),
        date: values.date,
        note: values.note || undefined,
      });
      toast.success(
        expense
          ? "Expense updated."
          : "Expense added. A clearer picture, one entry at a time.",
      );
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="money-form" noValidate>
      <Field label="What was it for?">
        <input
          className="input"
          placeholder="e.g. Lunch with friends"
          autoFocus
          {...register("title")}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <span className="money-error">{errors.title.message}</span>
        )}
      </Field>
      <div className="form-grid">
        <Field label="Amount (₹)">
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            {...register("amount")}
            aria-invalid={!!errors.amount}
          />
          {errors.amount && (
            <span className="money-error">{errors.amount.message}</span>
          )}
        </Field>
        <Field label="Category">
          <select className="input" {...register("category")}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Date">
        <input
          className="input"
          type="date"
          max={todayISO()}
          {...register("date")}
          aria-invalid={!!errors.date}
        />
        {errors.date && (
          <span className="money-error">{errors.date.message}</span>
        )}
      </Field>
      <Field label="Note (optional)">
        <textarea
          className="input money-textarea"
          placeholder="Anything you want to remember…"
          rows={3}
          {...register("note")}
        />
        {errors.note && (
          <span className="money-error">{errors.note.message}</span>
        )}
      </Field>
      <p className="money-form-note">
        <Wallet size={14} /> Your entries help you understand your habits.
        Spending never earns XP.
      </p>
      <div className="form-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : expense ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { addGoal, editGoal } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title ?? "",
      amount: goal ? moneyInput(goal.targetPaise) : "",
      targetDate: goal?.targetDate ?? "",
    },
  });
  async function submit(values: GoalValues) {
    try {
      const input = {
        title: values.title,
        targetPaise: parseMoney(values.amount),
        targetDate: values.targetDate,
      };
      if (goal) await editGoal(goal.id, input);
      else await addGoal(input);
      toast.success(
        goal
          ? "Savings goal updated."
          : "Your next big thing starts here. Goal created!",
      );
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="money-form" noValidate>
      <Field label="What are you saving for?">
        <input
          className="input"
          placeholder="e.g. A new laptop"
          autoFocus
          {...register("title")}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <span className="money-error">{errors.title.message}</span>
        )}
      </Field>
      <Field label="Target amount (₹)">
        <input
          className="input"
          inputMode="decimal"
          placeholder="25000"
          {...register("amount")}
          aria-invalid={!!errors.amount}
        />
        {errors.amount && (
          <span className="money-error">{errors.amount.message}</span>
        )}
      </Field>
      <Field
        label="Target date (optional)"
        hint="A little direction. No pressure."
      >
        <input className="input" type="date" {...register("targetDate")} />
        {errors.targetDate && (
          <span className="money-error">{errors.targetDate.message}</span>
        )}
      </Field>
      <div className="form-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : goal ? "Save goal" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}

function ContributionForm({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const { contribute } = useApp();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = savingsTotal(goal);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validMoney(amount)) {
      setError("Enter a positive amount with up to 2 decimal places.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await contribute(goal.id, parseMoney(amount));
      toast.success("Contribution recorded. Your future self says thanks.");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="money-form" noValidate>
      <div className="money-contribution-summary">
        <PiggyBank size={26} />
        <div>
          <strong>{goal.title}</strong>
          <span>
            {formatMoney(saved)} saved of {formatMoney(goal.targetPaise)}
          </span>
        </div>
        <Badge tone="mint">{percentage(saved, goal.targetPaise)}%</Badge>
      </div>
      <Progress value={percentage(saved, goal.targetPaise)} tone="mint" />
      <Field label="Contribution amount (₹)">
        <input
          autoFocus
          className="input"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
          placeholder="0.00"
          aria-invalid={!!error}
        />
        {error && <span className="money-error">{error}</span>}
      </Field>
      <p className="muted text-sm">
        Record money you have already set aside. This does not transfer any
        funds or add an expense.
      </p>
      <div className="form-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Recording…" : "Record contribution"}
        </Button>
      </div>
    </form>
  );
}

function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  function shift(direction: number) {
    const date = monthDate(month);
    date.setMonth(date.getMonth() + direction);
    onChange(monthKey(date));
  }
  return (
    <div className="money-month-picker">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => shift(-1)}
      >
        <ChevronLeft size={17} />
      </button>
      <label>
        <CalendarDays size={15} />
        <span>{monthName(month)}</span>
        <input
          type="month"
          value={month}
          aria-label="Choose month"
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) =>
            event.target.value && onChange(event.target.value)
          }
        />
      </label>
      <button type="button" aria-label="Next month" onClick={() => shift(1)}>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function downloadExpenses(expenses: Expense[], month: string) {
  const csv = [
    ["Date", "Description", "Category", "Amount (INR)", "Note"],
    ...expenses.map((expense) => [
      expense.date,
      expense.title,
      expense.category,
      (expense.amountPaise / 100).toFixed(2),
      expense.note ?? "",
    ]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `vyloop-expenses-${month}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success(
    `${expenses.length} expense${expenses.length === 1 ? "" : "s"} exported.`,
  );
}

export function MoneyPage() {
  const app = useApp();
  const reducedMotion = useReducedMotion();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [expenseEditor, setExpenseEditor] = useState<Expense | "new" | null>(
    null,
  );
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [goalEditor, setGoalEditor] = useState<Goal | "new" | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [busy, setBusy] = useState(false);
  const summary = budgetSummary(app.state, monthDate(month));
  const monthExpenses = app.expenses.filter(
    (expense) => expense.date.slice(0, 7) === month,
  );
  const filtered = monthExpenses
    .filter(
      (expense) =>
        (category === "All categories" || expense.category === category) &&
        `${expense.title} ${expense.note ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const saved = app.goals.reduce(
    (total, goal) => total + savingsTotal(goal),
    0,
  );
  const breakdown = categories
    .map((category) => ({
      category,
      amount: monthExpenses
        .filter((expense) => expense.category === category)
        .reduce((total, expense) => total + expense.amountPaise, 0),
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const previousDate = monthDate(month);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousSpent = app.expenses
    .filter((expense) => expense.date.startsWith(monthKey(previousDate)))
    .reduce((total, expense) => total + expense.amountPaise, 0);
  const difference = previousSpent
    ? Math.round(((summary.spent - previousSpent) / previousSpent) * 100)
    : null;
  const currentHistoryGoal = historyGoal
    ? app.goals.find((goal) => goal.id === historyGoal.id)
    : null;

  async function saveBudget(event: React.FormEvent) {
    event.preventDefault();
    if (!validMoney(budgetInput, true)) {
      setBudgetError("Enter a nonnegative amount with up to 2 decimal places.");
      return;
    }
    setBusy(true);
    try {
      await app.setBudget(parseMoney(budgetInput), month);
      toast.success("Monthly budget updated.");
      setBudgetOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function confirmDeleteExpense() {
    if (!deleteExpense) return;
    setBusy(true);
    try {
      await app.deleteExpense(deleteExpense.id);
      toast.success("Expense deleted.");
      setDeleteExpense(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function confirmDeleteGoal() {
    if (!deleteGoal) return;
    setBusy(true);
    try {
      await app.deleteGoal(deleteGoal.id);
      toast.success("Savings goal deleted.");
      setDeleteGoal(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack money-page">
      <PageHeading
        eyebrow="YOUR MONEY, WITH INTENTION"
        title="MoneyLoop"
        description="Make room for the things that matter."
        action={
          <Button onClick={() => setExpenseEditor("new")}>
            <Plus size={17} /> Add expense
          </Button>
        }
      />
      <div className="money-period-row">
        <div className="money-period-copy">
          <span className="money-live-dot" /> Your monthly snapshot
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <div className="stats-grid money-stats">
        <Card
          className={`money-budget-stat ${summary.budget > 0 && summary.remaining < 0 ? "is-over-budget" : ""}`}
        >
          <div className="money-stat-top">
            <span className="stat-label">
              {summary.budget === 0
                ? "Your monthly plan"
                : summary.remaining < 0
                  ? "Over your monthly plan"
                  : "Left in your budget"}
            </span>
            <Wallet size={19} />
          </div>
          <div className="stat-value">
            {summary.budget ? formatMoney(summary.remaining) : "No budget set"}
          </div>
          <div className="money-budget-caption">
            <span>
              {formatMoney(summary.spent)}{" "}
              {summary.budget
                ? `of ${formatMoney(summary.budget)} used`
                : "tracked this month"}
            </span>
            <button
              type="button"
              onClick={() => {
                setBudgetInput(moneyInput(summary.budget));
                setBudgetError("");
                setBudgetOpen(true);
              }}
            >
              Edit budget <Pencil size={12} />
            </button>
          </div>
          <Progress
            value={summary.percentage}
            tone={summary.remaining < 0 ? "warning" : "mint"}
          />
          <span className="money-stat-foot">
            {summary.budget
              ? `${Math.round(summary.percentage)}% of your budget used`
              : "Set a budget that works for you"}
          </span>
        </Card>
        <Card>
          <div className="money-stat-top">
            <span className="stat-label">Total spending</span>
            <span className="money-stat-icon violet">
              <Receipt size={19} />
            </span>
          </div>
          <div className="stat-value">{formatMoney(summary.spent)}</div>
          <div className="money-stat-comparison">
            {difference === null ? (
              <span className="muted">Your spending this month</span>
            ) : (
              <>
                <span className={difference <= 0 ? "mint" : "muted"}>
                  {difference <= 0 ? (
                    <ArrowDownLeft size={15} />
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                  {Math.abs(difference)}%
                </span>
                <span className="muted">vs. last month</span>
              </>
            )}
          </div>
          <span className="money-stat-foot">
            {monthExpenses.length} recorded transaction
            {monthExpenses.length === 1 ? "" : "s"}
          </span>
        </Card>
        <Card>
          <div className="money-stat-top">
            <span className="stat-label">Set aside for your future</span>
            <span className="money-stat-icon mint">
              <PiggyBank size={20} />
            </span>
          </div>
          <div className="stat-value">{formatMoney(saved)}</div>
          <div className="money-stat-comparison">
            <span className="mint">
              <TrendingUp size={15} /> Every bit counts
            </span>
          </div>
          <span className="money-stat-foot">
            Across {app.goals.length} savings goal
            {app.goals.length === 1 ? "" : "s"}
          </span>
        </Card>
      </div>
      {summary.remaining < 0 && summary.budget > 0 && (
        <div className="money-budget-notice">
          <Wallet size={19} />
          <p>
            <strong>A little over the plan. It happens.</strong> You’re{" "}
            {formatMoney(-summary.remaining)} above your budget. Review your
            entries or adjust your plan to fit this month.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBudgetInput(moneyInput(summary.budget));
              setBudgetError("");
              setBudgetOpen(true);
            }}
          >
            Adjust budget
          </Button>
        </div>
      )}

      <div className="money-main-grid">
        <Card className="money-transactions">
          <SectionHeading
            title="Your transactions"
            subtitle="Small details. A clearer picture."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadExpenses(filtered, month)}
                disabled={filtered.length === 0}
              >
                <Download size={15} /> Export
              </Button>
            }
          />
          <div className="money-transaction-toolbar">
            <label className="money-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transactions…"
                aria-label="Search transactions"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <select
              className="input money-category-select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter expense category"
            >
              <option>All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          {filtered.length ? (
            <div className="table-wrap">
              <table className="data-table money-expense-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th className="money-align-right">Amount</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => {
                    const appearance = categoryAppearance[expense.category];
                    const Icon = appearance.icon;
                    return (
                      <tr key={expense.id}>
                        <td>
                          <div className="money-transaction-name">
                            <span
                              className="money-category-icon"
                              style={{
                                color: appearance.color,
                                background: `${appearance.color}14`,
                              }}
                            >
                              <Icon size={18} />
                            </span>
                            <div>
                              <strong>{expense.title}</strong>
                              <span>{expense.note || expense.category}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="money-category-tag">
                            {expense.category}
                          </span>
                        </td>
                        <td className="muted">{readableDate(expense.date)}</td>
                        <td className="money-align-right money-expense-amount">
                          −{formatMoney(expense.amountPaise)}
                        </td>
                        <td>
                          <div className="money-row-actions">
                            <button
                              type="button"
                              aria-label={`Edit ${expense.title}`}
                              onClick={() => setExpenseEditor(expense)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${expense.title}`}
                              onClick={() => setDeleteExpense(expense)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title={
                search || category !== "All categories"
                  ? "No matching transactions"
                  : "A fresh month, a fresh start"
              }
              description={
                search || category !== "All categories"
                  ? "Try a different search or category to find what you’re looking for."
                  : "Log your first expense to start getting to know your spending."
              }
              action={
                search || category !== "All categories" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("All categories");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setExpenseEditor("new")}
                  >
                    <Plus size={15} /> Add your first expense
                  </Button>
                )
              }
            />
          )}
          {filtered.length > 0 && (
            <div className="money-table-footer">
              <span>
                {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
                {filtered.length !== monthExpenses.length
                  ? ` of ${monthExpenses.length}`
                  : ""}
              </span>
              <span>
                Total{" "}
                <strong>
                  {formatMoney(
                    filtered.reduce(
                      (total, expense) => total + expense.amountPaise,
                      0,
                    ),
                  )}
                </strong>
              </span>
            </div>
          )}
        </Card>
        <Card className="money-breakdown">
          <SectionHeading title="Where it goes" subtitle={monthName(month)} />
          {breakdown.length ? (
            <>
              <div
                className="money-mini-donut"
                role="img"
                aria-label={`Spending by category. ${breakdown.map((entry) => `${entry.category}: ${formatMoney(entry.amount)}`).join(". ")}`}
              >
                <ResponsiveContainer width="100%" height={184}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={61}
                      outerRadius={79}
                      paddingAngle={4}
                      stroke="none"
                      animationDuration={450}
                      isAnimationActive={!reducedMotion}
                    >
                      {breakdown.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={categoryAppearance[entry.category].color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                      contentStyle={chartTooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="money-donut-label">
                  <span className="muted">Total spent</span>
                  <strong>{formatMoney(summary.spent)}</strong>
                </div>
              </div>
              <div className="money-category-list">
                {breakdown.map((entry) => (
                  <div key={entry.category}>
                    <span>
                      <i
                        style={{
                          background: categoryAppearance[entry.category].color,
                        }}
                      />
                      {entry.category}
                    </span>
                    <strong>{formatMoney(entry.amount)}</strong>
                    <small>
                      {summary.spent
                        ? Math.round((entry.amount / summary.spent) * 100)
                        : 0}
                      %
                    </small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="money-breakdown-empty">
              <Wallet size={34} />
              <p>Your spending story starts with your first entry.</p>
            </div>
          )}
          <div className="money-gentle-insight">
            <Sparkles size={16} />
            <p>
              {breakdown.length
                ? `${breakdown[0].category} makes up ${Math.round((breakdown[0].amount / summary.spent) * 100)}% of this month’s spending. A useful place to start your next check-in.`
                : "A quick money check-in today can bring more peace of mind tomorrow."}
            </p>
          </div>
        </Card>
      </div>

      <section className="money-goals-section">
        <SectionHeading
          title="For your next big thing"
          subtitle="Dream it. Save a little. Get there."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGoalEditor("new")}
            >
              <Plus size={15} /> New goal
            </Button>
          }
        />
        {app.goals.length ? (
          <div className="money-goals-grid">
            {app.goals.map((goal, index) => {
              const saved = savingsTotal(goal);
              const percent = percentage(saved, goal.targetPaise);
              return (
                <Card
                  key={goal.id}
                  className={`goal-card money-goal-card ${percent >= 100 ? "money-goal-complete" : ""}`}
                >
                  <div className="goal-top">
                    <span
                      className={`money-goal-icon ${index % 2 ? "violet" : "mint"}`}
                    >
                      <Target size={22} />
                    </span>
                    <div className="money-goal-heading">
                      <h3>{goal.title}</h3>
                      <span className="muted text-sm">
                        {percent >= 100
                          ? "You made it. Take a moment to celebrate."
                          : goal.targetDate
                            ? `Aiming for ${readableDate(goal.targetDate)} ${new Date(`${goal.targetDate}T12:00:00`).getFullYear()}`
                            : "One contribution closer"}
                      </span>
                    </div>
                    <div className="money-row-actions">
                      <button
                        type="button"
                        aria-label={`Edit ${goal.title}`}
                        onClick={() => setGoalEditor(goal)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${goal.title}`}
                        onClick={() => setDeleteGoal(goal)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="money-goal-values">
                    <strong>
                      {formatMoney(saved)}{" "}
                      <span>of {formatMoney(goal.targetPaise)}</span>
                    </strong>
                    <span className={index % 2 ? "violet" : "mint"}>
                      {percent}%
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    tone={index % 2 ? "violet" : "mint"}
                  />
                  <div className="money-goal-footer">
                    <button type="button" onClick={() => setHistoryGoal(goal)}>
                      <History size={14} />
                      {goal.contributions.length} contribution
                      {goal.contributions.length === 1 ? "" : "s"}
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setContributionGoal(goal)}
                    >
                      <Plus size={14} /> Add savings
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={PiggyBank}
              title="Give your savings a purpose"
              description="A course, a trip, a rainy day. Your first goal can be anything that matters to you."
              action={
                <Button onClick={() => setGoalEditor("new")}>
                  <Plus size={16} /> Create a savings goal
                </Button>
              }
            />
          </Card>
        )}
      </section>

      <Modal
        open={expenseEditor !== null}
        onClose={() => setExpenseEditor(null)}
        title={expenseEditor === "new" ? "Add an expense" : "Edit expense"}
        description="A small check-in with your money."
      >
        {expenseEditor && (
          <ExpenseForm
            key={expenseEditor === "new" ? "new" : expenseEditor.id}
            expense={expenseEditor === "new" ? undefined : expenseEditor}
            onClose={() => setExpenseEditor(null)}
          />
        )}
      </Modal>
      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Set your monthly budget"
        description={`Choose a comfortable plan for ${monthName(month)}.`}
      >
        <form className="money-form" onSubmit={saveBudget} noValidate>
          <Field
            label="Monthly budget (₹)"
            hint="Use 0 to leave this month without a spending limit."
          >
            <input
              autoFocus
              className="input"
              inputMode="decimal"
              value={budgetInput}
              onChange={(event) => {
                setBudgetInput(event.target.value);
                setBudgetError("");
              }}
              aria-invalid={!!budgetError}
            />
            {budgetError && <span className="money-error">{budgetError}</span>}
          </Field>
          <p className="muted text-sm">
            Your budget is a guide, and it can change as your month does.
          </p>
          <div className="form-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setBudgetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save budget"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={deleteExpense !== null}
        onClose={() => setDeleteExpense(null)}
        title="Delete this expense?"
        description={
          deleteExpense
            ? `${deleteExpense.title} · ${formatMoney(deleteExpense.amountPaise)}`
            : undefined
        }
      >
        <p className="muted">
          This entry will be removed from your transactions and spending totals.
          You can add it again later.
        </p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setDeleteExpense(null)}>
            Keep expense
          </Button>
          <Button
            variant="danger"
            onClick={confirmDeleteExpense}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete expense"}
          </Button>
        </div>
      </Modal>
      <Modal
        open={goalEditor !== null}
        onClose={() => setGoalEditor(null)}
        title={
          goalEditor === "new" ? "Create a savings goal" : "Edit your goal"
        }
        description="Make a little space for something you care about."
      >
        {goalEditor && (
          <GoalForm
            key={goalEditor === "new" ? "new" : goalEditor.id}
            goal={goalEditor === "new" ? undefined : goalEditor}
            onClose={() => setGoalEditor(null)}
          />
        )}
      </Modal>
      <Modal
        open={contributionGoal !== null}
        onClose={() => setContributionGoal(null)}
        title="A little closer to your goal"
        description="Good things grow one contribution at a time."
      >
        {contributionGoal && (
          <ContributionForm
            goal={contributionGoal}
            onClose={() => setContributionGoal(null)}
          />
        )}
      </Modal>
      <Modal
        open={historyGoal !== null}
        onClose={() => setHistoryGoal(null)}
        title="Your savings journey"
        description={currentHistoryGoal?.title}
      >
        {currentHistoryGoal &&
          (currentHistoryGoal.contributions.length ? (
            <div className="money-contribution-history">
              {[...currentHistoryGoal.contributions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((entry, index) => (
                  <div key={entry.id}>
                    <span className="money-contribution-dot">
                      <ArrowDownLeft size={17} />
                    </span>
                    <div>
                      <strong>
                        Contribution{" "}
                        {currentHistoryGoal.contributions.length - index}
                      </strong>
                      <span>
                        {readableDate(entry.date)}{" "}
                        {new Date(entry.date).getFullYear()}
                      </span>
                    </div>
                    <strong className="mint">
                      +{formatMoney(entry.amountPaise)}
                    </strong>
                  </div>
                ))}
              <div className="money-history-total">
                <span>Total saved</span>
                <strong>{formatMoney(savingsTotal(currentHistoryGoal))}</strong>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={PiggyBank}
              title="The first step is yours"
              description="Add your first contribution to start your savings journey."
              action={
                <Button
                  onClick={() => {
                    setContributionGoal(currentHistoryGoal);
                    setHistoryGoal(null);
                  }}
                >
                  Add savings
                </Button>
              }
            />
          ))}
      </Modal>
      <Modal
        open={deleteGoal !== null}
        onClose={() => setDeleteGoal(null)}
        title="Delete this savings goal?"
        description={deleteGoal?.title}
      >
        <p className="muted">
          This removes the goal and its contribution records. Your real savings
          stay right where you put them.
        </p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setDeleteGoal(null)}>
            Keep goal
          </Button>
          <Button variant="danger" disabled={busy} onClick={confirmDeleteGoal}>
            {busy ? "Deleting…" : "Delete goal"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const chartTooltipStyle = {
  background: "var(--card, #151e30)",
  border: "1px solid var(--border, #293248)",
  borderRadius: 12,
  color: "var(--text, #f8fafc)",
  fontSize: 12,
};
function compactRupees(value: number) {
  return value >= 1000
    ? `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : `₹${value}`;
}

export function AnalyticsPage() {
  const app = useApp();
  const reducedMotion = useReducedMotion();
  const [period, setPeriod] = useState("6");
  const [month, setMonth] = useState(monthKey(new Date()));
  const data = useMemo(
    () =>
      Array.from({ length: Number(period) }, (_, index) => {
        const date = monthDate(month);
        date.setMonth(date.getMonth() - Number(period) + index + 1);
        const summary = budgetSummary(app.state, date);
        return {
          name: date.toLocaleDateString("en-IN", { month: "short" }),
          label: monthName(monthKey(date)),
          key: monthKey(date),
          spent: summary.spent / 100,
          budget: summary.budget / 100,
          remaining: summary.remaining,
        };
      }),
    [app.state, month, period],
  );
  const monthExpenses = app.expenses.filter((expense) =>
    expense.date.startsWith(month),
  );
  const breakdown = categories
    .map((category) => ({
      name: category,
      amount: monthExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amountPaise, 0),
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const spent = monthExpenses.reduce(
    (total, expense) => total + expense.amountPaise,
    0,
  );
  const totalPeriod = data.reduce(
    (sum, entry) => sum + Math.round(entry.spent * 100),
    0,
  );
  const average = Math.round(totalPeriod / Number(period));
  const saved = app.goals.reduce((sum, goal) => sum + savingsTotal(goal), 0);
  const previousSpent =
    data.length > 1 ? Math.round(data[data.length - 2].spent * 100) : 0;
  const change =
    previousSpent > 0
      ? Math.round(((spent - previousSpent) / previousSpent) * 100)
      : null;
  const activeMonths = data.filter((entry) => entry.spent > 0).length;
  const goals = app.goals.map((goal) => ({
    ...goal,
    saved: savingsTotal(goal),
  }));
  return (
    <div className="page-stack money-page money-analytics">
      <PageHeading
        eyebrow="PROGRESS, IN PERSPECTIVE"
        title="Your money, a little clearer."
        description="Less guessing. More understanding your own rhythm."
        action={<MonthPicker month={month} onChange={setMonth} />}
      />
      <div className="stats-grid money-stats">
        <Card>
          <div className="money-stat-top">
            <span className="stat-label">
              Spent in{" "}
              {monthDate(month).toLocaleDateString("en-IN", { month: "long" })}
            </span>
            <Receipt size={19} />
          </div>
          <div className="stat-value">{formatMoney(spent)}</div>
          <span className="money-stat-foot">
            {change === null
              ? "Your monthly spending at a glance"
              : `${Math.abs(change)}% ${change <= 0 ? "less" : "more"} than the previous month`}
          </span>
        </Card>
        <Card>
          <div className="money-stat-top">
            <span className="stat-label">Monthly average</span>
            <TrendingUp size={19} />
          </div>
          <div className="stat-value">{formatMoney(average)}</div>
          <span className="money-stat-foot">
            Across the selected {period}-month window
          </span>
        </Card>
        <Card>
          <div className="money-stat-top">
            <span className="stat-label">Savings to date</span>
            <PiggyBank size={20} />
          </div>
          <div className="stat-value mint">{formatMoney(saved)}</div>
          <span className="money-stat-foot">
            {goals.filter((goal) => goal.saved >= goal.targetPaise).length} of{" "}
            {goals.length} goals reached
          </span>
        </Card>
      </div>
      <Card className="money-trend-card">
        <SectionHeading
          title="Your spending rhythm"
          subtitle="A little perspective on the bigger picture."
          action={
            <select
              className="input money-period-select"
              aria-label="Chart time range"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </select>
          }
        />
        <div className="money-chart-legend">
          <span>
            <i style={{ background: "#a88cf5" }} /> Spending
          </span>
          <span>
            <i className="money-legend-line" /> Monthly budget
          </span>
        </div>
        <div
          className="money-spending-chart"
          role="img"
          aria-label={`Spending compared with monthly budget over ${period} months. ${data.map((entry) => `${entry.label}: ${formatMoney(Math.round(entry.spent * 100))} spent, ${formatMoney(Math.round(entry.budget * 100))} budget`).join(". ")}`}
        >
          <ResponsiveContainer width="100%" height={286}>
            <ComposedChart
              data={data}
              margin={{ left: -16, right: 12, top: 12, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--border, #293248)"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted, #94a3b8)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                tickFormatter={compactRupees}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted, #94a3b8)", fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.label ?? ""
                }
                formatter={(value, name) => [
                  formatMoney(Math.round(Number(value ?? 0) * 100)),
                  name === "spent" ? "Spending" : "Budget",
                ]}
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "var(--chart-hover, #8b5cf608)" }}
              />
              <Bar
                dataKey="spent"
                fill="#a88cf5"
                radius={[5, 5, 0, 0]}
                maxBarSize={42}
                animationDuration={450}
                isAnimationActive={!reducedMotion}
              />
              <Line
                dataKey="budget"
                type="monotone"
                stroke="#5ed4c0"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={450}
                isAnimationActive={!reducedMotion}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="money-chart-insight">
          <Sparkles size={17} />
          <p>
            {activeMonths
              ? `You’ve recorded spending in ${activeMonths} of these ${period} months. Your average of ${formatMoney(average)} includes months with no entries, so log consistently for a fuller picture.`
              : "Your first expense is the start of the story. As you keep tracking, your monthly patterns will appear here."}
          </p>
        </div>
      </Card>
      <div className="money-analytics-grid">
        <Card>
          <SectionHeading
            title="The category picture"
            subtitle={`${monthName(month)} · ${monthExpenses.length} transactions`}
          />
          {breakdown.length ? (
            <div className="money-analytics-categories">
              <div
                className="money-analytics-donut"
                role="img"
                aria-label={breakdown
                  .map((entry) => `${entry.name}: ${formatMoney(entry.amount)}`)
                  .join(". ")}
              >
                <ResponsiveContainer width="100%" height={216}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      stroke="none"
                      animationDuration={450}
                      isAnimationActive={!reducedMotion}
                    >
                      {breakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={categoryAppearance[entry.name].color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                      contentStyle={chartTooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="money-donut-label">
                  <span className="muted">This month</span>
                  <strong>{formatMoney(spent)}</strong>
                </div>
              </div>
              <div className="money-category-list">
                {breakdown.map((entry) => (
                  <div key={entry.name}>
                    <span>
                      <i
                        style={{
                          background: categoryAppearance[entry.name].color,
                        }}
                      />
                      {entry.name}
                    </span>
                    <strong>{formatMoney(entry.amount)}</strong>
                    <small>{Math.round((entry.amount / spent) * 100)}%</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No expenses this month"
              description="Your category picture will appear as you add transactions in MoneyLoop."
            />
          )}
        </Card>
        <Card>
          <SectionHeading
            title="Dreams in progress"
            subtitle="Every contribution is a step forward."
          />
          {goals.length ? (
            <div className="money-analytics-goals">
              {goals.map((goal, index) => (
                <div key={goal.id}>
                  <div>
                    <span className={index % 2 ? "violet" : "mint"}>
                      <Target size={16} />
                    </span>
                    <strong>{goal.title}</strong>
                    <span className="muted">
                      {percentage(goal.saved, goal.targetPaise)}%
                    </span>
                  </div>
                  <Progress
                    value={percentage(goal.saved, goal.targetPaise)}
                    tone={index % 2 ? "violet" : "mint"}
                  />
                  <p>
                    <strong>{formatMoney(goal.saved)}</strong>
                    <span className="muted">
                      of {formatMoney(goal.targetPaise)}
                    </span>
                  </p>
                </div>
              ))}
              <div className="money-gentle-insight">
                <PiggyBank size={17} />
                <p>
                  {formatMoney(saved)} set aside across your goals. This is
                  money you’ve intentionally made room for.
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="Something to look forward to"
              description="Create a savings goal in MoneyLoop and follow its progress here."
            />
          )}
        </Card>
      </div>
      <Card>
        <SectionHeading
          title="Month by month"
          subtitle="Your spending and the plans you set."
        />
        <div className="table-wrap">
          <table className="data-table money-history-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Spending</th>
                <th>Budget</th>
                <th>Remaining</th>
                <th>Plan used</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((entry) => (
                <tr key={entry.key}>
                  <td>
                    <strong>{entry.label}</strong>
                  </td>
                  <td>{formatMoney(Math.round(entry.spent * 100))}</td>
                  <td>
                    {entry.budget ? (
                      formatMoney(Math.round(entry.budget * 100))
                    ) : (
                      <span className="muted">No budget set</span>
                    )}
                  </td>
                  <td
                    className={
                      entry.budget
                        ? entry.remaining < 0
                          ? "money-negative"
                          : "mint"
                        : "muted"
                    }
                  >
                    {entry.budget ? formatMoney(entry.remaining) : "—"}
                  </td>
                  <td>
                    {entry.budget ? (
                      <div className="money-history-progress">
                        <Progress
                          value={(entry.spent / entry.budget) * 100}
                          tone={entry.remaining < 0 ? "warning" : "violet"}
                        />
                        <span>
                          {Math.round((entry.spent / entry.budget) * 100)}%
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
