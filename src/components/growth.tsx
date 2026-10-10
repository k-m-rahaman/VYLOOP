"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  CircleCheck,
  Code2,
  Dumbbell,
  Flame,
  GitBranch,
  Leaf,
  Lightbulb,
  LockKeyhole,
  Monitor,
  Moon,
  Mountain,
  Palette,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Trash2,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { parsePersonalBackup } from "@/lib/personal-data";
import {
  achievements,
  DIFFICULTY_XP,
  levelInfo,
  QUEST_CATEGORIES,
  skills,
  streak,
  totalXP,
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
} from "@/components/ui";
import "./growth.css";

const categoryIcons: Record<string, LucideIcon> = {
  "Coding & Technology": Code2,
  Learning: BookOpen,
  Fitness: Dumbbell,
  Productivity: Target,
  Creativity: Palette,
  "Personal Development": Sprout,
  "Financial Literacy": Wallet,
};
const categoryTones: Record<string, string> = {
  "Coding & Technology": "violet",
  Learning: "blue",
  Fitness: "mint",
  Productivity: "amber",
  Creativity: "rose",
  "Personal Development": "mint",
  "Financial Literacy": "amber",
};
const branchIcons: Record<string, LucideIcon> = {
  Technology: Code2,
  Finance: Wallet,
  Health: Dumbbell,
  Productivity: Target,
  Creativity: Palette,
};
const branchActivity: Record<string, string> = {
  Technology: "coding and technology",
  Finance: "financial literacy",
  Health: "fitness",
  Productivity: "productivity or personal development",
  Creativity: "creativity or learning",
};
const skillDescriptions: Record<string, string> = {
  "technology-0":
    "Make your first small thing. A little time in your editor is the beginning of a builder’s mindset.",
  "technology-1":
    "Turn curiosity into practice. Build confidence by solving small problems one session at a time.",
  "technology-2":
    "Carry an idea through to something you can share. Your repeated practice is adding up.",
  "finance-0":
    "Get comfortable with where your money goes. Awareness is a useful first step toward more intentional choices.",
  "finance-1":
    "Build a regular check-in with your money, and give your future plans room in your everyday choices.",
  "finance-2":
    "Keep learning the habits behind saving, budgeting, and planning. Consistent attention makes money feel more manageable.",
  "health-0":
    "Make a little room to move. A walk, a stretch, or a short workout all count as showing up for yourself.",
  "health-1":
    "Find movement that fits your life. Small sessions you enjoy are easier to return to.",
  "health-2":
    "Recognize the work you have put into your wellbeing. Let your own progress set the pace.",
  "productivity-0":
    "Give one task your attention. Starting small makes focused work feel more approachable.",
  "productivity-1":
    "Make space for uninterrupted practice. A few focused sessions can turn a big task into steady progress.",
  "productivity-2":
    "Build a rhythm you can return to. Regular practice is a skill of its own.",
  "creativity-0":
    "Follow a question, a page, or an idea. Curiosity gives you somewhere new to begin.",
  "creativity-1":
    "Make a little time to experiment and learn. You do not need a perfect result to make meaningful progress.",
  "creativity-2":
    "Bring your own perspective to what you make. Your growing practice has given you more ways to explore.",
};
const achievementIcons: Record<string, LucideIcon> = {
  Target,
  Award,
  Trophy,
  Flame,
  Wallet,
  Sprout,
  GitBranch,
  Zap,
  BookOpen,
  CalendarDays,
  PiggyBank: Wallet,
  Footprints: Sprout,
  CircleCheck,
  Sparkles,
  Star: Sparkles,
  Medal: Award,
  Gem: Trophy,
};
const avatarIcons: Record<string, LucideIcon> = {
  orbit: Sparkles,
  leaf: Leaf,
  mountain: Mountain,
  code: Code2,
  spark: Zap,
};
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const localDay = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function GrowthStat({
  label,
  value,
  icon: Icon,
  tone = "violet",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <Card className={`growth-stat ${tone}`}>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
      <Icon aria-hidden="true" />
    </Card>
  );
}

function FormError({ message }: { message: string }) {
  return message ? (
    <p className="growth-form-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function LifePage() {
  const app = useApp();
  const [tab, setTab] = useState<"available" | "custom" | "history">(
    "available",
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [questDifficulty, setQuestDifficulty] =
    useState<keyof typeof DIFFICULTY_XP>("Easy");
  const completedIds = new Set(
    app.completions.map((completion) => completion.questId),
  );
  const today = localDay(new Date());
  const completedToday = app.completions.filter(
    (completion) => localDay(completion.completedAt) === today,
  );
  const available = app.quests.filter((quest) => !completedIds.has(quest.id));
  const displayed = app.quests.filter((quest) => {
    if (
      tab === "history"
        ? !completedIds.has(quest.id)
        : completedIds.has(quest.id)
    )
      return false;
    if (tab === "custom" && !quest.isCustom) return false;
    return (
      (category === "all" || quest.category === category) &&
      `${quest.title} ${quest.description}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const orderedHistory = [...app.completions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    return {
      date,
      active: app.completions.some(
        (completion) => localDay(completion.completedAt) === localDay(date),
      ),
    };
  });

  async function complete(id: string) {
    setBusyId(id);
    try {
      const quest = app.quests.find((item) => item.id === id)!;
      await app.completeQuest(id);
      setFeedback(
        `Nice work. “${quest.title}” complete — ${quest.xp} XP earned.`,
      );
      toast.success(`Quest complete! +${quest.xp} XP`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete this quest.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    if (title.length < 3 || description.length < 10) {
      setFormError(
        "Give your quest a title of at least 3 characters and a description of at least 10 characters.",
      );
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      await app.addQuest({
        title,
        description,
        category: String(
          form.get("category"),
        ) as (typeof app.quests)[number]["category"],
        difficulty: questDifficulty,
        ...(form.get("deadline")
          ? { deadline: String(form.get("deadline")) }
          : {}),
      });
      setCreateOpen(false);
      setTab("custom");
      toast.success("Your quest is ready. Make it happen.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not create quest.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteQuest() {
    if (!deleteId) return;
    try {
      await app.deleteQuest(deleteId);
      setDeleteId(null);
      toast.success("Custom quest removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete quest.",
      );
    }
  }

  return (
    <div className="growth-page">
      <PageHeading
        eyebrow="A LITTLE BETTER, EVERY DAY"
        title="LifeLoop"
        description="Small steps. Real progress. Find your next challenge."
        action={
          <Button
            onClick={() => {
              setFormError("");
              setCreateOpen(true);
            }}
          >
            <Plus size={16} /> Create quest
          </Button>
        }
      />
      <div className="growth-summary">
        <GrowthStat
          label="Completed today"
          value={completedToday.length}
          icon={CircleCheck}
          tone="mint"
        />
        <GrowthStat
          label="Current streak"
          value={`${streak(app.completions)} days`}
          icon={Flame}
          tone="amber"
        />
        <GrowthStat
          label="XP earned today"
          value={`+${completedToday.reduce((sum, completion) => sum + completion.xp, 0)}`}
          icon={Zap}
        />
      </div>
      {feedback && (
        <div className="growth-feedback" role="status">
          <CheckCheck size={17} />
          {feedback}
          <button
            className="growth-delete"
            aria-label="Dismiss completion message"
            onClick={() => setFeedback("")}
            style={{ marginLeft: "auto" }}
          >
            <Check size={15} />
          </button>
        </div>
      )}
      <div className="growth-filters">
        <div className="growth-tabs" role="tablist" aria-label="Quest views">
          <button
            className={`growth-tab ${tab === "available" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "available"}
            onClick={() => setTab("available")}
          >
            Discover quests <span className="count">{available.length}</span>
          </button>
          <button
            className={`growth-tab ${tab === "custom" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "custom"}
            onClick={() => setTab("custom")}
          >
            My quests
          </button>
          <button
            className={`growth-tab ${tab === "history" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "history"}
            onClick={() => setTab("history")}
          >
            Completed
          </button>
        </div>
        <div className="growth-filter-inputs">
          <label className="growth-search">
            <Search size={15} />
            <input
              aria-label="Search quests"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quests..."
            />
          </label>
          <select
            className="growth-select"
            aria-label="Filter quest category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {QUEST_CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="growth-content-grid">
        <section
          aria-label={
            tab === "history" ? "Completed quest history" : "Available quests"
          }
        >
          {tab === "history" ? (
            <div className="growth-list">
              {orderedHistory
                .filter((completion) =>
                  displayed.some((quest) => quest.id === completion.questId),
                )
                .map((completion) => {
                  const quest = app.quests.find(
                    (item) => item.id === completion.questId,
                  )!;
                  const Icon = categoryIcons[quest.category] || Target;
                  return (
                    <Card className="growth-history" key={completion.questId}>
                      <div
                        className={`growth-icon ${categoryTones[quest.category]}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3>{quest.title}</h3>
                        <p>
                          {dateLabel(completion.completedAt)} · {quest.category}
                        </p>
                      </div>
                      <span className="growth-xp">
                        <Zap size={14} /> +{completion.xp} XP
                      </span>
                    </Card>
                  );
                })}
              {displayed.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  title="Your progress starts here"
                  description="Complete a quest to see it in your history. Every small step counts."
                  action={
                    <Button
                      onClick={() => {
                        setTab("available");
                        setSearch("");
                        setCategory("all");
                      }}
                    >
                      Discover a quest <ArrowRight size={14} />
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="growth-quest-grid">
              {displayed.map((quest) => {
                const Icon = categoryIcons[quest.category] || Target;
                return (
                  <Card className="growth-quest" key={quest.id}>
                    <div className="growth-quest-top">
                      <div
                        className={`growth-icon ${categoryTones[quest.category]}`}
                      >
                        <Icon size={19} />
                      </div>
                      <Badge
                        tone={
                          quest.difficulty === "Hard"
                            ? "orange"
                            : quest.difficulty === "Medium"
                              ? "violet"
                              : "mint"
                        }
                      >
                        {quest.difficulty}
                      </Badge>
                    </div>
                    <h3>{quest.title}</h3>
                    <p>{quest.description}</p>
                    <div className="growth-quest-tags">
                      <span>{quest.category}</span>
                      {quest.deadline && (
                        <span>
                          <CalendarDays size={11} />
                          {dateLabel(quest.deadline)}
                        </span>
                      )}
                      {quest.isCustom && <span>Custom quest</span>}
                    </div>
                    <div className="growth-quest-bottom">
                      <span className="growth-xp">
                        <Zap size={14} /> +{quest.xp} XP
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {quest.isCustom && (
                          <button
                            className="growth-delete"
                            aria-label={`Delete ${quest.title}`}
                            onClick={() => setDeleteId(quest.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === quest.id}
                          onClick={() => complete(quest.id)}
                        >
                          {busyId === quest.id
                            ? "Completing..."
                            : "Complete quest"}
                          <Check size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {tab !== "history" && displayed.length === 0 && (
            <EmptyState
              icon={Target}
              title={
                tab === "custom"
                  ? "Make progress your way"
                  : "A fresh start awaits"
              }
              description={
                search || category !== "all"
                  ? "No quests match these filters. Try another search or category."
                  : tab === "custom"
                    ? "Create a personal challenge that fits your goals and earn a reward based on its difficulty."
                    : "You have completed all available quests. Create your next personal challenge."
              }
              action={
                <Button
                  onClick={() => {
                    setFormError("");
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={15} />
                  Create a quest
                </Button>
              }
            />
          )}
        </section>
        <aside className="growth-aside">
          <Card className="growth-aside-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0 }}>Keep your spark alive</h3>
              <Flame size={18} color="#fbbf24" />
            </div>
            <div className="growth-streak-number">
              {streak(app.completions)}
              <span>day streak</span>
            </div>
            <p className="growth-form-help">
              One meaningful action a day is all it takes.
            </p>
            <div
              className="growth-week"
              aria-label="Quest activity over the last seven days"
            >
              {week.map(({ date, active }) => (
                <div
                  className={`growth-week-day ${active ? "active" : ""}`}
                  key={localDay(date)}
                  title={`${dateLabel(date.toISOString())}: ${active ? "quest completed" : "no quests"}`}
                >
                  <span>
                    {date
                      .toLocaleDateString("en-IN", { weekday: "short" })
                      .slice(0, 1)}
                  </span>
                  <div>{active ? <Check size={12} /> : <span>·</span>}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="growth-aside-card">
            <h3>Your pace. Your progress.</h3>
            <div className="growth-tip">
              <Lightbulb size={17} />
              <span>
                Choose a challenge that feels achievable today. Consistency
                grows from small wins.
              </span>
            </div>
            <div className="growth-tip" style={{ marginTop: 18 }}>
              <ShieldCheck size={17} />
              <span>
                Each quest earns XP once. Difficulty sets the reward: easy 40,
                medium 60, hard 100. Daily limits keep progress meaningful.
              </span>
            </div>
          </Card>
        </aside>
      </div>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create your next quest"
        description="Make it specific, achievable, and a little challenging."
      >
        <form className="growth-form" onSubmit={addCustom}>
          <Field label="Quest name">
            <input
              name="title"
              placeholder="Read 20 pages of a book"
              minLength={3}
              maxLength={100}
              required
              autoFocus
            />
          </Field>
          <Field label="What does success look like?">
            <textarea
              name="description"
              placeholder="Read without distractions and write down one idea to remember."
              minLength={10}
              maxLength={500}
              required
            />
          </Field>
          <div className="growth-form-row">
            <Field label="Category">
              <select name="category">
                {QUEST_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select
                name="difficulty"
                value={questDifficulty}
                onChange={(event) =>
                  setQuestDifficulty(
                    event.target.value as keyof typeof DIFFICULTY_XP,
                  )
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </Field>
          </div>
          <div className="growth-form-row">
            <Field
              label="XP reward"
              hint="Based on difficulty. Claim once per quest."
            >
              <input value={`${DIFFICULTY_XP[questDifficulty]} XP`} readOnly />
            </Field>
            <Field label="Deadline (optional)">
              <input name="deadline" type="date" min={today} />
            </Field>
          </div>
          <FormError message={formError} />
          <div className="growth-form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              <Plus size={15} />
              {creating ? "Creating..." : "Create quest"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this custom quest?"
        description="This removes the quest from your list. Completed activity and earned XP are kept."
      >
        <div className="growth-form-actions">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Keep quest
          </Button>
          <Button variant="danger" onClick={deleteQuest}>
            Delete quest
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function SkillsPage() {
  const app = useApp();
  const nodes = skills(app.state);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    nodes.find((node) => node.id === selectedId) ||
    nodes.find((node) => !node.unlocked) ||
    nodes[0];
  const branches = [...new Set(nodes.map((node) => node.branch))];
  const unlocked = nodes.filter((node) => node.unlocked).length;
  const level = levelInfo(totalXP(app.state));
  return (
    <div className="growth-page">
      <PageHeading
        eyebrow="BUILD WHAT MAKES YOU, YOU"
        title="Your skill tree"
        description="Every quest you finish opens a new possibility."
        action={
          <Badge tone="violet">
            <GitBranch size={13} />
            {unlocked} of {nodes.length} skills unlocked
          </Badge>
        }
      />
      <div className="growth-summary">
        <GrowthStat label="Skills unlocked" value={unlocked} icon={GitBranch} />
        <GrowthStat
          label="Quests completed"
          value={app.completions.length}
          icon={CircleCheck}
          tone="mint"
        />
        <GrowthStat
          label="Current level"
          value={String(level.level).padStart(2, "0")}
          icon={Zap}
          tone="amber"
        />
      </div>
      <div className="growth-note">
        <Sparkles size={16} />
        <span>
          Skills unlock automatically as you complete quests in each branch.
          Select any node to see what you have learned and what comes next.
        </span>
      </div>
      <div className="growth-branch-grid">
        {branches.map((branch) => {
          const branchNodes = nodes.filter((node) => node.branch === branch);
          const Icon = branchIcons[branch] || GitBranch;
          const completed = branchNodes.filter((node) => node.unlocked).length;
          return (
            <Card className="growth-branch" key={branch}>
              <div className="growth-branch-head">
                <div
                  className={`growth-icon ${branch === "Health" ? "mint" : branch === "Finance" ? "amber" : branch === "Creativity" ? "rose" : ""}`}
                >
                  <Icon size={20} />
                </div>
                <h3>{branch}</h3>
                <p>
                  {completed} / {branchNodes.length} unlocked
                </p>
                <Progress
                  value={(completed / branchNodes.length) * 100}
                  tone={branch === "Health" ? "mint" : "violet"}
                />
              </div>
              <div className="growth-node-chain">
                {branchNodes.map((node, index) => (
                  <div key={node.id} style={{ display: "contents" }}>
                    {index > 0 && (
                      <div
                        className={`growth-node-connector ${node.unlocked ? "unlocked" : ""}`}
                        aria-hidden="true"
                      />
                    )}
                    <button
                      className={`growth-node ${node.unlocked ? "unlocked" : ""} ${selected?.id === node.id ? "selected" : ""}`}
                      onClick={() => setSelectedId(node.id)}
                      aria-pressed={selected?.id === node.id}
                      aria-label={`${node.title}, ${node.unlocked ? "unlocked" : "locked"}. View requirements.`}
                    >
                      {node.unlocked ? (
                        <Icon size={22} />
                      ) : (
                        <LockKeyhole size={20} />
                      )}
                      <span>{node.title}</span>
                      <small>
                        {node.unlocked
                          ? "Unlocked"
                          : `${Math.min(node.progress, node.required)} / ${node.required} quests`}
                      </small>
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {selected && (
        <Card className="growth-skill-detail" aria-live="polite">
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Badge tone={selected.unlocked ? "mint" : "neutral"}>
                {selected.unlocked ? "Unlocked" : "Next milestone"}
              </Badge>
              <span className="growth-muted" style={{ fontSize: 11 }}>
                {selected.branch}
              </span>
            </div>
            <h3>{selected.title}</h3>
            <p>{skillDescriptions[selected.id] || selected.description}</p>
            <div className="growth-requirement">
              {selected.unlocked ? (
                <Check size={15} />
              ) : (
                <LockKeyhole size={14} />
              )}
              {selected.unlocked
                ? "You earned this through your completed quests."
                : `Complete ${selected.required} ${branchActivity[selected.branch] || selected.branch.toLowerCase()} quests to unlock. ${Math.max(0, selected.required - selected.progress)} to go.`}
            </div>
          </div>
          <div style={{ minWidth: 160 }}>
            <div className="growth-progress-label">
              <span>Branch activity</span>
              <span>
                {Math.min(selected.progress, selected.required)} /{" "}
                {selected.required}
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                (selected.progress / selected.required) * 100,
              )}
              tone={selected.unlocked ? "mint" : "violet"}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export function AchievementsPage() {
  const app = useApp();
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const items = achievements(app.state);
  const earned = items.filter((item) => item.unlocked);
  const displayed = items.filter(
    (item) =>
      filter === "all" ||
      (filter === "unlocked" ? item.unlocked : !item.unlocked),
  );
  return (
    <div className="growth-page">
      <PageHeading
        eyebrow="YOUR EFFORT DESERVES A LITTLE SPOTLIGHT"
        title="Achievements"
        description="A collection of moments you made happen."
      />
      <div className="growth-summary">
        <GrowthStat
          label="Badges earned"
          value={`${earned.length} / ${items.length}`}
          icon={Trophy}
          tone="amber"
        />
        <GrowthStat
          label="Lifetime XP"
          value={totalXP(app.state).toLocaleString("en-IN")}
          icon={Zap}
        />
        <GrowthStat
          label="Collection complete"
          value={`${Math.round((earned.length / Math.max(1, items.length)) * 100)}%`}
          icon={Award}
          tone="mint"
        />
      </div>
      <div className="growth-filters">
        <div
          className="growth-tabs"
          role="tablist"
          aria-label="Achievement filter"
        >
          <button
            role="tab"
            aria-selected={filter === "all"}
            className={`growth-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All badges <span className="count">{items.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={filter === "unlocked"}
            className={`growth-tab ${filter === "unlocked" ? "active" : ""}`}
            onClick={() => setFilter("unlocked")}
          >
            Unlocked
          </button>
          <button
            role="tab"
            aria-selected={filter === "locked"}
            className={`growth-tab ${filter === "locked" ? "active" : ""}`}
            onClick={() => setFilter("locked")}
          >
            In progress
          </button>
        </div>
        <span className="growth-muted" style={{ fontSize: 12 }}>
          Earned through actual activity. Always.
        </span>
      </div>
      <div className="growth-achievement-grid">
        {displayed.map((achievement) => {
          const Icon = achievementIcons[achievement.icon] || Award;
          const progress = Math.min(achievement.progress, achievement.target);
          return (
            <Card
              className={`growth-achievement ${achievement.unlocked ? "unlocked" : "locked"}`}
              key={achievement.id}
            >
              <div className="growth-achievement-top">
                <div className="growth-medallion">
                  <Icon size={27} />
                </div>
                {achievement.unlocked ? (
                  <Badge tone="mint">
                    <Check size={11} />
                    Unlocked
                  </Badge>
                ) : (
                  <LockKeyhole size={14} className="growth-muted" />
                )}
              </div>
              <div>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
              </div>
              <div>
                <div className="growth-progress-label">
                  <span>
                    {achievement.unlocked
                      ? "Milestone reached"
                      : "Your progress"}
                  </span>
                  <span>
                    {progress} / {achievement.target}
                  </span>
                </div>
                <Progress
                  value={(progress / Math.max(1, achievement.target)) * 100}
                  tone={achievement.unlocked ? "mint" : "violet"}
                />
              </div>
              <div className="growth-earned">
                {achievement.unlocked ? (
                  <>
                    <CalendarDays size={12} />
                    {achievement.earnedAt
                      ? `Earned ${dateLabel(achievement.earnedAt)}`
                      : "Achievement unlocked"}
                  </>
                ) : (
                  <span className="growth-muted">
                    Your next win is waiting.
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {displayed.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={
            filter === "unlocked"
              ? "Your first badge is within reach"
              : "You have earned them all"
          }
          description={
            filter === "unlocked"
              ? "Complete quests, track your money, and build your collection one meaningful action at a time."
              : "Keep building good habits and creating new challenges for yourself."
          }
          action={
            <Button variant="secondary" onClick={() => setFilter("all")}>
              View all badges
            </Button>
          }
        />
      )}
    </div>
  );
}

export function SettingsPage() {
  const app = useApp();
  const router = useRouter();
  const [restoreBackup, setRestoreBackup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState(
    avatarIcons[app.profile.avatar || ""] ? app.profile.avatar! : "orbit",
  );
  const [confirmation, setConfirmation] = useState<"delete" | null>(
    null,
  );
  const [confirmationText, setConfirmationText] = useState("");
  const [dangerBusy, setDangerBusy] = useState(false);
  const xp = totalXP(app.state);
  const level = levelInfo(xp);
  const earned = achievements(app.state).filter((item) => item.unlocked).length;
  const AvatarIcon = avatarIcons[app.profile.avatar || "orbit"] || Sparkles;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const dailyMinutes = Number(form.get("dailyMinutes"));
    if (name.length < 1 || name.length > 60) {
      setError("Choose a display name between 1 and 60 characters.");
      return;
    }
    if (
      !Number.isInteger(dailyMinutes) ||
      dailyMinutes < 5 ||
      dailyMinutes > 240
    ) {
      setError("Set a daily activity target from 5 to 240 minutes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await app.updateProfile({
        name,
        avatar,
        dailyMinutes,
        goals: String(form.get("goals") || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 5),
        interests: String(form.get("interests") || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 5),
      });
      toast.success("Profile updated. Make it yours.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeTheme(theme: "dark" | "light" | "system") {
    try {
      await app.setTheme(theme);
    } catch (failure) {
      toast.error(
        failure instanceof Error ? failure.message : "Could not change theme.",
      );
    }
  }

  async function confirmDanger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmationText !== "DELETE")
      return;
    setDangerBusy(true);
    try {
      await app.deleteData();
      setConfirmation(null);
      toast.success("Your records have been deleted from this browser.");
    } catch (failure) {
      toast.error(
        failure instanceof Error
          ? failure.message
          : "Could not complete this action.",
      );
    } finally {
      setDangerBusy(false);
    }
  }

  function openConfirmation(kind: "delete") {
    setConfirmationText("");
    setConfirmation(kind);
  }

  return (
    <div className="growth-page">
      <PageHeading
        eyebrow="MAKE VYLOOP FEEL LIKE YOU"
        title="Profile & settings"
        description="Your preferences, your privacy, your rules."
      />
      <div className="growth-settings">
        <aside>
          <Card className="growth-profile">
            <div className="growth-profile-avatar">
              <AvatarIcon size={38} />
            </div>
            <h2>{app.profile.name}</h2>
            <p>Your personal workspace</p>
            <Badge tone="violet">
              <Zap size={12} />
              Level {level.level}
            </Badge>
            <div style={{ width: "100%", marginTop: 6 }}>
              <div className="growth-progress-label">
                <span>{level.currentXP} XP</span>
                <span>{level.nextLevelXP} XP</span>
              </div>
              <Progress value={level.progress} />
            </div>
            <div className="growth-profile-stats">
              <div>
                <strong>{app.completions.length}</strong>
                <span>Quests complete</span>
              </div>
              <div>
                <strong>{earned}</strong>
                <span>Badges earned</span>
              </div>
            </div>
            <div
              className="growth-note"
              style={{ textAlign: "left", marginTop: 8 }}
            >
              <ShieldCheck size={15} />
              <span>
                {app.storageWarning || "Your records are saved in this browser."}
              </span>
            </div>
          </Card>
        </aside>
        <div className="growth-settings-panels">
          <Card className="growth-settings-card">
            <h3>
              <Settings2 size={17} />
              Personal profile
            </h3>
            <p>A few details to make your journey a little more personal.</p>
            <form className="growth-form" onSubmit={saveProfile}>
              <Field label="Choose your avatar">
                <div className="growth-avatar-choices">
                  {Object.entries(avatarIcons).map(([key, Icon]) => (
                    <button
                      type="button"
                      key={key}
                      aria-label={`${key} avatar`}
                      aria-pressed={avatar === key}
                      className={`growth-avatar-choice ${avatar === key ? "selected" : ""}`}
                      onClick={() => setAvatar(key)}
                    >
                      <Icon size={19} />
                    </button>
                  ))}
                </div>
              </Field>
              <div className="growth-form-row">
                <Field label="Display name">
                  <input
                    name="name"
                    defaultValue={app.profile.name}
                    minLength={1}
                    maxLength={60}
                    required
                  />
                </Field>
                <Field label="Daily activity target (minutes)">
                  <input
                    name="dailyMinutes"
                    type="number"
                    defaultValue={app.profile.dailyMinutes}
                    min={5}
                    max={240}
                    step={5}
                    required
                  />
                </Field>
              </div>
              <Field
                label="Your goals"
                hint="Separate up to five goals with commas."
              >
                <input
                  name="goals"
                  defaultValue={app.profile.goals.join(", ")}
                  placeholder="Build better habits, learn to code"
                  maxLength={300}
                />
              </Field>
              <Field
                label="Skill interests"
                hint="Separate up to five interests with commas."
              >
                <input
                  name="interests"
                  defaultValue={app.profile.interests.join(", ")}
                  placeholder="Technology, creativity, finance"
                  maxLength={300}
                />
              </Field>
              <FormError message={error} />
              <div className="growth-form-actions">
                <Button type="submit" disabled={saving}>
                  <Check size={15} />
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>
          <Card className="growth-settings-card">
            <h3>
              <Sun size={17} />
              Appearance
            </h3>
            <p>Choose the environment that feels right for you.</p>
            <div
              className="growth-theme-options"
              role="group"
              aria-label="Theme preference"
            >
              {(
                [
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "light", label: "Light", icon: Sun },
                  { value: "system", label: "System", icon: Monitor },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`growth-theme-option ${app.theme === value ? "selected" : ""}`}
                  aria-pressed={app.theme === value}
                  onClick={() => changeTheme(value)}
                >
                  <Icon size={17} />
                  {label}
                  {app.theme === value && <Check size={13} />}
                </button>
              ))}
            </div>
          </Card>
          <Card className="growth-settings-card">
            <h3>
              <ShieldCheck size={17} />
              Privacy & your data
            </h3>
            <p>Your records stay in this browser on this device. Anyone using the same browser profile can open them. Clearing site data removes your progress, so keep a backup.</p>
            <div className="growth-setting-row">
              <div>
                <h4>Export your data</h4>
                <p>
                  Download your profile, quests, activity, and financial records
                  as JSON.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  try {
                    app.exportData();
                    toast.success("Your data export is ready.");
                  } catch {
                    toast.error("Could not export your data.");
                  }
                }}
              >
                <ArrowDownToLine size={14} />
                Export
              </Button>
            </div>
            <div className="growth-setting-row">
              <div><h4>Restore a backup</h4><p>Choose a VYLOOP JSON backup. It replaces your current records after you confirm.</p></div>
              <input type="file" accept=".json,application/json" aria-label="Choose VYLOOP backup"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 5_000_000) throw new Error("Choose a backup smaller than 5 MB.");
                    const json = await file.text();
                    parsePersonalBackup(json);
                    setRestoreBackup(json);
                  } catch (failure) {
                    toast.error(failure instanceof Error ? failure.message : "Could not read this backup.");
                  } finally { input.value = ""; }
                }} />
            </div>
          </Card>
          <Card className="growth-settings-card danger">
            <h3>
              <Trash2 size={17} />
              Your data
            </h3>
            <p>
              These actions change stored data. You will confirm before anything
              is removed.
            </p>
            <div className="growth-setting-row">
              <div>
                <h4>
                  Delete this browser’s data
                </h4>
                <p>
                  Remove your profile, quests, and money records from this browser. You can start fresh afterward.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => openConfirmation("delete")}
              >
                Delete data
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Modal
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title="Delete your data from this browser?"
        description="This removes your profile, progress, and money records from this browser. Export a backup first if you want to keep them."
      >
        <form className="growth-form" onSubmit={confirmDanger}>
          <Field
            label="Type DELETE to confirm"
          >
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>
          <div className="growth-form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={
                dangerBusy ||
                confirmationText !==
                  "DELETE"
              }
            >
              {dangerBusy ? "Working..." : "Delete permanently"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={restoreBackup !== null} onClose={() => setRestoreBackup(null)}
        title="Replace your records with this backup?"
        description="Your current profile, progress, and money records will be replaced. Export your current records first if you want to keep them.">
        <div className="growth-form-actions">
          <Button variant="ghost" onClick={() => setRestoreBackup(null)}>Cancel</Button>
          <Button onClick={async () => {
            try { await app.importData(restoreBackup!); setRestoreBackup(null); router.push("/#dashboard"); toast.success("Backup restored."); }
            catch (failure) { toast.error(failure instanceof Error ? failure.message : "Could not restore this backup."); }
          }}>Restore backup</Button>
        </div>
      </Modal>
    </div>
  );
}
