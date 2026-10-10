"use client";
import Link from "next/link";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Heart,
  Leaf,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { parseMoney } from "@/lib/engine";
import {
  EXPENSE_CATEGORIES,
  QUEST_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/types";
import { Button, Field, Logo, Modal } from "./ui";

const lifeGoals = [
  { name: "Build better habits", icon: Target },
  { name: "Learn new skills", icon: BookOpen },
  { name: "Get more active", icon: Heart },
  { name: "Manage my money", icon: Wallet },
  { name: "Find my focus", icon: Leaf },
  { name: "Make time to create", icon: Sparkles },
];
export function Onboarding({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(app.data.profile.name);
  const [goals, setGoals] = useState<string[]>(app.data.profile.goals);
  const [interests, setInterests] = useState<string[]>(
    app.data.profile.interests,
  );
  const [daily, setDaily] = useState(app.data.profile.dailyMinutes || 20);
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toggle = (v: string, items: string[], setter: (a: string[]) => void) =>
    setter(items.includes(v) ? items.filter((i) => i !== v) : [...items, v]);
  const next = async () => {
    setError("");
    if (step === 0 && (!name.trim() || name.trim().length > 60)) {
      setError("Choose a display name between 1 and 60 characters.");
      return;
    }
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    try {
      const budgetPaise = budget ? parseMoney(budget) : null;
      const goalPaise = target ? parseMoney(target) : null;
      if (saving.trim() && !target)
        throw new Error(
          "Add a target amount for your savings goal, or leave both fields blank.",
        );
      if (target && !saving.trim())
        throw new Error("Give your savings goal a name.");
      await app.finishOnboarding(
        { name: name.trim(), goals, interests, dailyMinutes: daily },
        budgetPaise ?? undefined,
        goalPaise !== null
          ? { title: saving.trim(), targetPaise: goalPaise }
          : undefined,
      );
      toast.success(`Your loop starts here, ${name.split(" ")[0]}.`);
      onDone();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your preferences.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link href="/welcome/">
          <Logo />
        </Link>
        <div>
          <div
            className="eyebrow"
            style={{ color: "#ba9cef", marginBottom: 20 }}
          >
            A LITTLE MORE YOU
          </div>
          <h1 style={{ color: "#fff" }}>
            Make space
            <br />
            for your
            <br />
            <span style={{ color: "#b59af4" }}>next chapter.</span>
          </h1>
          <p>
            No perfect routine required.
            <br />
            Let’s find a rhythm that works for you.
          </p>
        </div>
        <small>
          No account needed · Saved in this browser
        </small>
      </aside>
      <main className="auth-form-side">
        <div className="auth-form onboard-form">
          <Logo />
          {app.storageWarning && (
            <p className="form-error" role="alert">{app.storageWarning}</p>
          )}
          <div className="onboard-progress">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={i <= step ? "done" : ""} />
            ))}
          </div>
          <div className="onboard-step">STEP {step + 1} OF 4</div>
          <h2>
            {
              [
                "What should we call you?",
                "What brings you here?",
                "Find your kind of progress.",
                "Give your money a direction.",
              ][step]
            }
          </h2>
          <p className="muted">
            {
              [
                "Your name makes your space feel like yours.",
                "Pick what feels right. You can change this any time.",
                "Choose your interests and a little time for yourself.",
                "These are optional. Your finances stay private.",
              ][step]
            }
          </p>
          {step === 0 ? (
            <Field label="Your display name">
              <input
                autoFocus
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="given-name"
              />
              <span className="muted text-sm">
                No email or password. Just a name to make this space yours.
              </span>
            </Field>
          ) : step === 1 ? (
            <div className="onboard-options">
              {lifeGoals.map((g) => (
                <button
                  key={g.name}
                  className={`onboard-option ${goals.includes(g.name) ? "selected" : ""}`}
                  onClick={() => toggle(g.name, goals, setGoals)}
                  aria-pressed={goals.includes(g.name)}
                >
                  <g.icon size={16} />
                  {g.name}
                  {goals.includes(g.name) && <Check size={12} />}
                </button>
              ))}
            </div>
          ) : step === 2 ? (
            <div className="form-stack">
              <div className="onboard-options">
                {QUEST_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`onboard-option ${interests.includes(c) ? "selected" : ""}`}
                    onClick={() => toggle(c, interests, setInterests)}
                    aria-pressed={interests.includes(c)}
                  >
                    {interests.includes(c) ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} />
                    )}{" "}
                    {c}
                  </button>
                ))}
              </div>
              <Field label="How much time would you like each day?">
                <select
                  value={daily}
                  onChange={(e) => setDaily(Number(e.target.value))}
                >
                  {[10, 15, 20, 30, 45, 60].map((n) => (
                    <option value={n} key={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
            <div className="form-stack">
              <Field label="Monthly budget (₹) — optional">
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 15000"
                />
              </Field>
              <div className="form-grid">
                <Field label="Saving for — optional">
                  <input
                    value={saving}
                    onChange={(e) => setSaving(e.target.value)}
                    placeholder="e.g. A new laptop"
                    maxLength={120}
                  />
                </Field>
                <Field label="Target amount (₹)">
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 80000"
                  />
                </Field>
              </div>
              <p className="demo-info">
                No bank connection needed. These records stay in this browser.
                You can export a backup anytime in Settings.
              </p>
            </div>
          )}
          {error && (
            <p className="form-error mt-4" role="alert">
              {error}
            </p>
          )}
          <div className="onboard-buttons">
            <Button
              variant="ghost"
              onClick={() => (step ? setStep((s) => s - 1) : onDone())}
            >
              <ArrowLeft />
              {step ? "Back" : "Explore first"}
            </Button>
            <Button onClick={next} disabled={busy}>
              {busy ? "Saving..." : step === 3 ? "Let’s do this" : "Continue"}
              <ArrowRight />
            </Button>
          </div>
          {(step === 0 || step === 3) && (
            <div className="auth-footer">
              <button
                disabled={busy}
                onClick={async () => {
                  try {
                    await app.finishOnboarding({
                      name: name.trim(),
                      goals,
                      interests,
                      dailyMinutes: daily,
                    });
                    onDone();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Try again.");
                  }
                }}
              >
                {step === 0 ? "Start with just my name" : "Skip money setup for now"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function QuickAdd({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const app = useApp();
  const [type, setType] = useState<"expense" | "quest" | "savings">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (type === "expense") {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        await app.saveExpense({
          title,
          category,
          amountPaise: parseMoney(amount),
          date,
        });
        toast.success("Expense added. A little more clarity.");
      } else if (type === "quest") {
        await app.addQuest({
          title,
          description: "Your personal daily win.",
          category: "Personal Development",
          difficulty: "Easy",
        });
        toast.success("Your quest is ready.");
      } else {
        if (!(goal || app.data.goals[0]?.id))
          throw new Error("Create a savings goal in MoneyLoop first.");
        await app.contribute(goal || app.data.goals[0].id, parseMoney(amount));
        toast.success("A little closer to your goal.");
      }
      setTitle("");
      setAmount("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Make a little progress"
      description="A quick action for your everyday."
    >
      <div className="quick-options">
        {[
          { id: "expense", icon: Receipt, label: "Log an expense" },
          { id: "quest", icon: Target, label: "Create a quest" },
          { id: "savings", icon: PiggyBank, label: "Add to savings" },
        ].map((o) => (
          <button
            key={o.id}
            className={`quick-option ${type === o.id ? "selected" : ""}`}
            onClick={() => {
              setType(o.id as typeof type);
              setError("");
            }}
            aria-pressed={type === o.id}
          >
            <o.icon />
            {o.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="form-stack">
        {type !== "savings" && (
          <Field
            label={
              type === "expense" ? "What was it for?" : "What’s your small win?"
            }
          >
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "expense"
                  ? "Coffee with friends"
                  : "Read for 20 minutes"
              }
            />
          </Field>
        )}
        {type === "expense" && (
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        )}
        {type === "savings" && (
          <Field label="Savings goal">
            <select
              value={goal || app.data.goals[0]?.id || ""}
              onChange={(e) => setGoal(e.target.value)}
            >
              {!app.data.goals.length && (
                <option value="">Create a goal in MoneyLoop first</option>
              )}
              {app.data.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        {type !== "quest" && (
          <Field label="Amount (₹)">
            <input
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 250"
            />
          </Field>
        )}
        {type === "quest" && (
          <p className="demo-info">
            Easy quest · 40 XP on completion. You can set categories and
            difficulty in LifeLoop.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions" style={{ marginTop: 0 }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || (type === "savings" && !app.data.goals.length)}
          >
            {busy ? "Saving..." : "Save progress"}
            <Check />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
