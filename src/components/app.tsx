"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Toaster, toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Flame,
  GitBranch,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  Leaf,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { AppProvider, useApp } from "@/lib/store";
import {
  achievements,
  budgetSummary,
  dateKey,
  formatMoney,
  levelInfo,
  savingsTotal,
  streak,
  totalXP,
  weeklyActivity,
} from "@/lib/engine";
import type { AppState, Quest } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Logo,
  Modal,
  Progress,
  SectionHeading,
} from "./ui";
import { AnalyticsPage, MoneyPage } from "./money";
import {
  AchievementsPage,
  LifePage,
  SettingsPage,
  SkillsPage,
} from "./growth";
import { Onboarding, QuickAdd } from "./forms";
import { Tutorial } from "./tutorial";
import { saveTutorialPreference, shouldShowTutorial } from "@/lib/tutorial";

type PageId =
  | "dashboard"
  | "lifeloop"
  | "moneyloop"
  | "skills"
  | "achievements"
  | "analytics"
  | "settings";
const navigation: {
  id: PageId;
  label: string;
  icon: LucideIcon;
  group: number;
}[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, group: 0 },
  { id: "lifeloop", label: "LifeLoop", icon: Target, group: 0 },
  { id: "moneyloop", label: "MoneyLoop", icon: Wallet, group: 0 },
  { id: "skills", label: "Skill tree", icon: GitBranch, group: 1 },
  { id: "achievements", label: "Achievements", icon: Trophy, group: 1 },
  { id: "analytics", label: "Analytics", icon: TrendingUp, group: 1 },
  { id: "settings", label: "Settings", icon: Settings, group: 2 },
];
export function VyloopApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
function AppContent() {
  const app = useApp();
  const { data, ready } = app;
  const [page, setPage] = useState<PageId>("dashboard");
  const [search, setSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [quick, setQuick] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [more, setMore] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [tutorialRequested, setTutorialRequested] = useState(false);
  const tutorialScopes = useRef(new Set<string>());
  const reduced = useReducedMotion();
  const level = levelInfo(totalXP(data));
  useEffect(() => {
    const update = () => {
      const hash = window.location.hash.slice(1);
      if (navigation.some((n) => n.id === hash)) setPage(hash as PageId);
      if (hash === "onboarding") setOnboard(true);
      if (hash === "tutorial") {
        setTutorialRequested(true);
      }
    };
    update();
    window.addEventListener("hashchange", update);
    const keys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("keydown", keys);
    };
  }, []);
  useEffect(() => {
    if (!ready || onboard || !data.profile.onboarded) return;
    const firstVisit = !tutorialScopes.current.has("personal");
    tutorialScopes.current.add("personal");
    if (tutorialRequested || (firstVisit && shouldShowTutorial({ mode: "personal" }))) {
      queueMicrotask(() => { setTutorial(true); setTutorialRequested(false); });
    }
  }, [ready, onboard, data.profile.onboarded, tutorialRequested]);
  const openTutorial = () => {
    setMore(false);
    setSearch(false);
    setNotifications(false);
    setTutorial(true);
  };
  const navigate = (id: PageId) => {
    setPage(id);
    window.history.pushState(null, "", `#${id}`);
    setMore(false);
    setSearch(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (!ready)
    return (
      <>
        <div className="loading-layout" aria-label="Loading VYLOOP">
          <div className="skeleton loading-top" />
          <div className="skeleton loading-banner" />
          <div className="stats-grid">
            {[0, 1, 2, 3].map((x) => (
              <div key={x} className="skeleton loading-cards" />
            ))}
          </div>
        </div>
        <Toaster richColors />
      </>
    );
  if (onboard || !data.profile.onboarded)
    return (
      <>
        <Onboarding
          onDone={() => {
            setOnboard(false);
            window.history.replaceState(null, "", "#dashboard");
          }}
        />
        <Toaster richColors />
      </>
    );
  const initial =
    data.profile.name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "YO";
  const toggleTheme = () => {
    void app
      .setTheme(
        document.documentElement.dataset.theme === "light" ? "dark" : "light",
      )
      .catch((e) => toast.error(e.message));
  };
  const nav = (item: (typeof navigation)[number]) => (
    <button
      key={item.id}
      className={`nav-item ${page === item.id ? "active" : ""}`}
      onClick={() => navigate(item.id)}
      aria-current={page === item.id ? "page" : undefined}
      title={item.label}
    >
      <item.icon />
      <span>{item.label}</span>
      {item.id === "lifeloop" && (
        <span className="nav-count">
          {
            data.quests.filter(
              (q) => !data.completions.some((c) => c.questId === q.id),
            ).length
          }
        </span>
      )}
    </button>
  );
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Link
            href="#dashboard"
            aria-label="VYLOOP overview"
            onClick={() => {
              if (collapsed) setCollapsed(false);
              navigate("dashboard");
            }}
          >
            <Logo />
          </Link>
          <button
            className="icon-button sidebar-collapse"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group-label">YOUR WORKSPACE</div>
          {navigation.filter((n) => n.group === 0).map(nav)}
          <div className="nav-group-label" style={{ marginTop: 12 }}>
            KEEP GROWING
          </div>
          {navigation.filter((n) => n.group === 1).map(nav)}
        </nav>
        <div className="sidebar-bottom">
          <div className="journey-card">
            <Sparkles size={20} className="violet" />
            <h4>Small steps. Big energy.</h4>
            <p>
              Your next level starts with
              <br />
              one good choice today.
            </p>
            <Link href="/welcome/">
              Meet your loops <ArrowUpRight size={12} />
            </Link>
          </div>
          {navigation.filter((n) => n.group === 2).map(nav)}
          <div className="sidebar-footer">
            <button
              className="avatar"
              onClick={() => navigate("settings")}
              aria-label="Open profile settings"
            >
              {initial}
            </button>
            <div>
              <strong>{data.profile.name || "Your profile"}</strong>
              <span className="muted">Level {level.level} · Explorer</span>
            </div>
            <button
              className="icon-button"
              aria-label="Edit profile"
              onClick={() => navigate("settings")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="app-topbar">
          <div className="breadcrumb">
            <Home size={14} />
            <ChevronRight size={12} />
            <span>Your workspace</span>
            <ChevronRight size={12} />
            <span>{navigation.find((n) => n.id === page)?.label}</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">Personal</span>
            <button
              className="search-trigger"
              onClick={() => setSearch(true)}
              aria-label="Search VYLOOP"
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="header-separator" />
            <button
              className="icon-button"
              onClick={openTutorial}
              title="How to use VYLOOP"
              aria-label="Help: how to use VYLOOP"
            >
              <HelpCircle size={17} />
            </button>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
            >
              {data.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="icon-button notification-button"
              onClick={() => setNotifications(true)}
              aria-label="Open activity notifications"
            >
              <Bell size={17} />
              {data.xpEvents.length > 0 && (
                <span className="notification-dot" />
              )}
            </button>
            <button
              className="avatar topbar-avatar"
              onClick={() => navigate("settings")}
              aria-label="Open your profile"
            >
              {initial}
            </button>
          </div>
        </header>
        <main className="content" id="main" tabIndex={-1}>
          {app.storageWarning && (
            <div className="storage-warning" role="alert">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>Changes may not survive a refresh</strong>
                <p>{app.storageWarning} Export your records in Settings to keep a copy.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate("settings")}>
                Open Settings
              </Button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={reduced ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              {page === "dashboard" ? (
                <Dashboard navigate={navigate} onQuick={() => setQuick(true)} />
              ) : page === "lifeloop" ? (
                <LifePage />
              ) : page === "moneyloop" ? (
                <MoneyPage />
              ) : page === "skills" ? (
                <SkillsPage />
              ) : page === "achievements" ? (
                <AchievementsPage />
              ) : page === "analytics" ? (
                <AnalyticsPage />
              ) : (
                <SettingsPage />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation
          .filter((n) =>
            ["dashboard", "lifeloop", "moneyloop"].includes(n.id),
          )
          .map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? "page" : undefined}
            >
              <n.icon />
              <span>
                {n.id === "dashboard"
                  ? "Home"
                  : n.label}
              </span>
            </button>
          ))}
        <button
          className={
            ["settings", "skills", "analytics", "achievements"].includes(page)
              ? "active"
              : ""
          }
          onClick={() => setMore(true)}
        >
          <Menu />
          <span>More</span>
        </button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Your workspace">
        <div className="mobile-more">
          {navigation
            .filter((n) =>
              ["skills", "achievements", "analytics", "settings"].includes(
                n.id,
              ),
            )
            .map(nav)}
          <button className="nav-item" onClick={openTutorial}>
            <HelpCircle size={18} />
            Help: quick guide
          </button>
          <Link className="nav-item" href="/welcome/">
            <HelpCircle size={18} />
            About VYLOOP
          </Link>
        </div>
      </Modal>
      <Modal
        open={search}
        onClose={() => setSearch(false)}
        title="Find your next step"
        description="Search pages and your quests."
      >
        <input
          autoFocus
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Try MoneyLoop or learning..."
          aria-label="Search pages and quests"
        />
        <div className="search-results">
          {navigation
            .filter((n) =>
              n.label.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((n) => (
              <button
                className="search-result"
                key={n.id}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={17} />
                <span>{n.label}</span>
                <ArrowRight size={14} />
              </button>
            ))}
          {data.quests
            .filter((q) =>
              q.title.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .slice(0, 6)
            .map((q) => (
              <button
                key={q.id}
                className="search-result"
                onClick={() => navigate("lifeloop")}
              >
                <Target size={17} />
                <span>{q.title}</span>
                <Badge tone="violet">{q.xp} XP</Badge>
              </button>
            ))}
          {searchTerm &&
            !navigation.some((n) =>
              n.label.toLowerCase().includes(searchTerm.toLowerCase()),
            ) &&
            !data.quests.some((q) =>
              q.title.toLowerCase().includes(searchTerm.toLowerCase()),
            ) && (
              <p className="muted" style={{ padding: 16 }}>
                No matches yet. Try a different word.
              </p>
            )}
        </div>
      </Modal>
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title="Your recent progress"
        description="A little proof that the small steps add up."
      >
        {data.xpEvents.length ? (
          [...data.xpEvents]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 8)
            .map((event) => (
              <div key={event.id} className="notification-item">
                <div className="icon-box">
                  <Zap size={18} />
                </div>
                <div>
                  <strong>+{event.amount} XP earned</strong>
                  <p>
                    {event.key.startsWith("quest:")
                      ? "Quest completed"
                      : event.key.includes("saving")
                        ? "Savings milestone reached"
                        : "Progress recorded"}{" "}
                    ·{" "}
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))
        ) : (
          <p className="demo-info">
            Complete your first quest to start your activity story.
          </p>
        )}
      </Modal>
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
      <Tutorial
        open={tutorial}
        mode="personal"
        onOpenChange={(open) => {
          if (!open) saveTutorialPreference({ mode: "personal" }, "dismissed");
          setTutorial(open);
        }}
        onFinish={(destination) => {
          saveTutorialPreference({ mode: "personal" }, "completed");
          setTutorial(false);
          navigate(destination === "quests" ? "lifeloop" : "moneyloop");
        }}
      />
      <Toaster
        richColors
        position="bottom-right"
        theme={data.theme}
        closeButton
      />
    </div>
  );
}

export function WelcomeBanner({
  level = 5,
  onExplore,
}: {
  level?: number;
  onExplore?: () => void;
}) {
  return (
    <section className="welcome-banner">
      <div className="banner-copy">
        <div className="banner-eyebrow">
          <Sparkles size={12} /> YOUR NEXT CHAPTER STARTS HERE
        </div>
        <h2>Little steps. Limitless you.</h2>
        <p>
          Build a habit. Learn something new. Make your money work.
          <br />
          Every small win moves you forward.
        </p>
        <Button onClick={onExplore}>
          Explore today’s quests <ArrowRight />
        </Button>
      </div>
      <div className="banner-art" aria-hidden="true">
        <svg width="390" height="240" viewBox="0 0 390 240" fill="none">
          <ellipse
            cx="229"
            cy="139"
            rx="150"
            ry="65"
            transform="rotate(-25 229 139)"
            stroke="#ad88f6"
            strokeOpacity=".22"
          />
          <ellipse
            cx="228"
            cy="140"
            rx="120"
            ry="96"
            transform="rotate(-25 228 140)"
            stroke="#ad88f6"
            strokeOpacity=".13"
          />
          <ellipse
            cx="228"
            cy="140"
            rx="175"
            ry="97"
            transform="rotate(-25 228 140)"
            stroke="#ad88f6"
            strokeOpacity=".08"
          />
          <path
            d="m145 156 5-2 2-5 2 5 5 2-5 2-2 5-2-5-5-2ZM307 48l3-1 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z"
            fill="#bda1ee"
          />
          <circle cx="337" cy="131" r="3" fill="#c0a4f2" />
          <circle cx="116" cy="90" r="2" fill="#b58ee4" />
          <circle cx="211" cy="218" r="2" fill="#b58ee4" />
        </svg>
        <div className="level-token">
          <div className="level-token-inner">
            <small>LEVEL</small>
            <strong>{level}</strong>
            <Zap size={14} fill="currentColor" />
          </div>
        </div>
        <div className="banner-float">
          <Target /> One step closer
        </div>
        <div className="banner-float second">
          <Sparkles size={12} /> Made for your next level
        </div>
      </div>
    </section>
  );
}

export function DashboardStats({ data }: { data: AppState }) {
  const info = levelInfo(totalXP(data));
  const activeStreak = streak(data.completions);
  const budget = budgetSummary(data);
  const completed = data.completions.filter(
    (c) => dateKey(new Date(c.completedAt)) === localDay(),
  ).length;
  return (
    <div className="stats-grid">
      <Card className="stat-card">
        <div className="stat-label">
          <Zap className="violet" />
          Current level
        </div>
        <div className="stat-value">
          Level {info.level} <small>Explorer</small>
        </div>
        <Progress value={info.progress} />
        <div className="stat-note muted" style={{ marginTop: 8 }}>
          {info.currentXP.toLocaleString()} /{" "}
          {info.nextLevelXP.toLocaleString()} XP to level {info.level + 1}
        </div>
      </Card>
      <Card className="stat-card">
        <div className="stat-label">
          <Flame className="orange" />
          Your streak
        </div>
        <div className="stat-value">
          {activeStreak}{" "}
          <small>{activeStreak === 1 ? "day" : "days"} strong</small>
        </div>
        <div className="stat-note orange">
          <Flame />
          {activeStreak > 0 ? "Keep your momentum" : "Start something good"}
          <span className="muted">one quest at a time</span>
        </div>
      </Card>
      <Card className="stat-card">
        <div className="stat-label">
          <Check className="mint" />
          Quests completed
        </div>
        <div className="stat-value">
          {completed} <small>today</small>
        </div>
        <div className="stat-note mint">
          <ArrowUpRight />
          {data.completions.length} total wins
          <span className="muted">and counting</span>
        </div>
      </Card>
      <Card className="stat-card">
        <div className="stat-label">
          <Wallet className="violet" />
          Monthly budget left
        </div>
        <div
          className={`stat-value ${budget.budget > 0 && budget.remaining < 0 ? "danger" : ""}`}
        >
          {budget.budget > 0 ? formatMoney(budget.remaining) : "Not set"}
        </div>
        <div
          className={`stat-note ${budget.budget > 0 && budget.remaining < 0 ? "danger" : "mint"}`}
        >
          <ArrowDownLeft />
          {budget.budget === 0
            ? "Make a plan in MoneyLoop"
            : budget.remaining < 0
              ? "Time to adjust your plan"
              : `${Math.max(0, Math.round(100 - budget.percentage))}% of your budget available`}
        </div>
      </Card>
    </div>
  );
}
function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const questIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  "Coding & Technology": { icon: Code2, tone: "violet" },
  "Coding and Technology": { icon: Code2, tone: "violet" },
  Learning: { icon: BookOpen, tone: "blue" },
  Fitness: { icon: Heart, tone: "orange" },
  Productivity: { icon: Target, tone: "mint" },
  Creativity: { icon: Sparkles, tone: "violet" },
  "Personal Development": { icon: Leaf, tone: "mint" },
  "Financial Literacy": { icon: Wallet, tone: "mint" },
};

function Dashboard({
  navigate,
  onQuick,
}: {
  navigate: (id: PageId) => void;
  onQuick: () => void;
}) {
  const { data, completeQuest } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const info = levelInfo(totalXP(data));
  const budget = budgetSummary(data);
  const activity = weeklyActivity(data.completions);
  const goal = data.goals[0];
  const badges = achievements(data)
    .filter((a) => a.unlocked)
    .slice(0, 3);
  const quests = [...data.quests]
    .sort(
      (a, b) =>
        Number(data.completions.some((c) => c.questId === a.id)) -
        Number(data.completions.some((c) => c.questId === b.id)),
    )
    .slice(0, 4);
  const spentCategories = Object.entries(
    data.expenses
      .filter((e) => e.date.slice(0, 7) === localDay().slice(0, 7))
      .reduce<Record<string, number>>((a, e) => {
        a[e.category] = (a[e.category] || 0) + e.amountPaise;
        return a;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  const claim = async (quest: Quest) => {
    setBusy(quest.id);
    try {
      await completeQuest(quest.id);
      toast.success(`That's a win. +${quest.xp} XP`, {
        description: quest.title,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not complete this quest.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR EVERYDAY, UPGRADED</div>
          <h1>
            Make today count, {data.profile.name.split(" ")[0] || "you"}
            <span className="violet">.</span>
          </h1>
          <p>Big things happen one small win at a time. You’ve got this.</p>
        </div>
        <div className="heading-action">
          <span className="date-label">
            <CalendarDays size={13} />
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          <Button onClick={onQuick}>
            <Plus />
            Quick add
          </Button>
        </div>
      </div>
      <WelcomeBanner
        level={info.level}
        onExplore={() => navigate("lifeloop")}
      />
      <DashboardStats data={data} />
      <div className="dashboard-grid">
        <div className="dashboard-left">
          <Card>
            <SectionHeading
              title="Your daily quests"
              subtitle="A little focus. A little progress. A better you."
              action={
                <button
                  className="text-link"
                  onClick={() => navigate("lifeloop")}
                >
                  View all <ArrowRight />
                </button>
              }
            />
            <div>
              {quests.length ? (
                quests.map((q) => {
                  const complete = data.completions.some(
                    (c) => c.questId === q.id,
                  );
                  const { icon: Icon, tone } = questIcons[q.category] || {
                    icon: Target,
                    tone: "violet",
                  };
                  return (
                    <div
                      key={q.id}
                      className={`quest-item ${complete ? "quest-complete" : ""}`}
                    >
                      <div className={`icon-box ${tone}`}>
                        <Icon size={19} />
                      </div>
                      <div className="quest-body">
                        <strong>{q.title}</strong>
                        <div className="quest-meta">
                          <span>{q.category}</span>
                          <span>·</span>
                          <Badge
                            tone={q.difficulty === "Easy" ? "mint" : "orange"}
                          >
                            {q.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <span className="quest-xp">+{q.xp} XP</span>
                      <button
                        className={`quest-checkbox ${complete ? "complete" : ""}`}
                        disabled={complete || busy === q.id}
                        onClick={() => claim(q)}
                        aria-label={
                          complete
                            ? `${q.title} completed`
                            : `Complete ${q.title}`
                        }
                      >
                        {complete && <Check size={13} />}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="demo-info">
                  Your first win is waiting. Create a quest in LifeLoop.
                </div>
              )}
            </div>
            <div className="quest-footer">
              <ShieldCheck />
              XP rewards progress, one completion per quest. No double claims.
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Your week in motion"
              subtitle="Showing up is what counts."
              action={<span className="chart-legend">Quests completed</span>}
            />
            <div className="chart-summary">
              <strong>{activity.reduce((a, d) => a + d.count, 0)}</strong>
              <span>small wins this week</span>
            </div>
            <div
              className="activity-chart"
              role="img"
              aria-label={`Quests completed in the last seven days: ${activity.map((a) => `${a.day} ${a.count}`).join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={activity}
                  margin={{ top: 5, right: 0, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 9 }}
                    dy={7}
                  />
                  <Tooltip
                    cursor={{ fill: "#8b5cf608" }}
                    formatter={(v) => [v, "Quests"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#9572ed"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={35}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Little wins, well earned"
              subtitle="Your collection of proof you’re growing."
              action={
                <button
                  className="text-link"
                  onClick={() => navigate("achievements")}
                >
                  All badges <ArrowRight />
                </button>
              }
            />
            <div className="achievement-preview">
              {badges.length ? (
                badges.map((b, i) => (
                  <div className="achievement-mini" key={b.id}>
                    <div
                      className={`achievement-medal ${i === 1 ? "mint" : i === 2 ? "orange" : ""}`}
                    >
                      {i === 0 ? (
                        <Zap size={23} />
                      ) : i === 1 ? (
                        <Leaf size={23} />
                      ) : (
                        <Flame size={23} />
                      )}
                    </div>
                    <strong>{b.title}</strong>
                    <span>Unlocked</span>
                  </div>
                ))
              ) : (
                <p
                  className="muted text-sm"
                  style={{ gridColumn: "1 / -1", padding: "10px 0" }}
                >
                  Your first badge is one completed quest away.
                </p>
              )}
            </div>
          </Card>
        </div>
        <div className="dashboard-right">
          <Card className="budget-card">
            <SectionHeading
              title="Your money, at a glance"
              action={
                <button
                  className="text-link"
                  aria-label="Open MoneyLoop"
                  onClick={() => navigate("moneyloop")}
                >
                  <ArrowUpRight />
                </button>
              }
            />
            <div
              className={`budget-value ${budget.budget > 0 && budget.remaining < 0 ? "danger" : ""}`}
            >
              {budget.budget > 0
                ? formatMoney(budget.remaining)
                : "Your plan starts here."}
            </div>
            <div className="budget-value-label">
              {budget.budget > 0
                ? `left of your ${formatMoney(budget.budget)} monthly budget`
                : "Set a monthly budget in MoneyLoop."}
            </div>
            <div className="budget-progress">
              <Progress
                value={budget.percentage}
                tone={
                  budget.budget > 0 && budget.remaining < 0 ? "danger" : "mint"
                }
              />
            </div>
            <div className="budget-labels">
              <span className="muted">{formatMoney(budget.spent)} spent</span>
              <span
                className={
                  budget.budget > 0 && budget.remaining < 0 ? "danger" : "mint"
                }
              >
                {budget.budget > 0
                  ? `${Math.round(budget.percentage)}% used`
                  : "No budget set"}
              </span>
            </div>
            <div className="budget-divider" />
            {spentCategories.length ? (
              spentCategories.map(([category, amount], i) => (
                <div className="spending-preview" key={category}>
                  <span>
                    <i className={`category-dot ${i ? "mint" : ""}`} />
                    {category}
                  </span>
                  <span>{formatMoney(amount)}</span>
                </div>
              ))
            ) : (
              <p className="muted text-sm">
                No expenses this month. A fresh start.
              </p>
            )}
            <div className="budget-hint">
              <TrendingUp />
              {budget.budget > 0 && budget.remaining < 0
                ? "Your plan can change with you. Adjust your budget."
                : "A little awareness goes a long way."}
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Saving for your next big thing"
              action={
                <button
                  className="text-link"
                  aria-label="Manage savings goals"
                  onClick={() => navigate("moneyloop")}
                >
                  <ArrowUpRight />
                </button>
              }
            />
            {goal ? (
              <>
                <div className="saving-main">
                  <div className="icon-box violet">
                    <Wallet size={21} />
                  </div>
                  <div>
                    <h3>{goal.title}</h3>
                    <p>Future you says thanks.</p>
                  </div>
                </div>
                <div className="saving-amount">
                  {formatMoney(savingsTotal(goal))}
                  <span> / {formatMoney(goal.targetPaise)}</span>
                </div>
                <Progress
                  value={(savingsTotal(goal) / goal.targetPaise) * 100}
                />
                <div className="saving-bottom">
                  <span>
                    {Math.min(
                      100,
                      Math.round((savingsTotal(goal) / goal.targetPaise) * 100),
                    )}
                    % of the way there
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate("moneyloop")}
                  >
                    <Plus />
                    Add savings
                  </Button>
                </div>
              </>
            ) : (
              <div className="demo-info">
                What are you working toward?
                <Button variant="ghost" onClick={() => navigate("moneyloop")}>
                  Create a savings goal <ArrowRight />
                </Button>
              </div>
            )}
          </Card>
          <Card className="insight-card">
            <Leaf size={19} />
            <div>
              <strong>Progress has no perfect pace.</strong>
              <p>
                Some days are for big moves. Some are for showing up. Both
                count.
              </p>
            </div>
          </Card>
        </div>
      </div>
      <footer className="dashboard-footer">
        <span>
          <Sparkles />
          Your life. Your levels. Your rules.
        </span>
        <span>
          Personal workspace · Saved in this browser
        </span>
      </footer>
    </div>
  );
}
