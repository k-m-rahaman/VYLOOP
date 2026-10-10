"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Flame,
  GitBranch,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { AppProvider, useApp } from "@/lib/store";
import { Badge, Card, Logo, SectionHeading } from "./ui";
import { DashboardStats, WelcomeBanner } from "./app";
import { levelInfo, totalXP } from "@/lib/engine";

export function Landing() {
  return (
    <AppProvider>
      <LandingContent />
    </AppProvider>
  );
}
function LandingContent() {
  const router = useRouter();
  const { data, setTheme } = useApp();
  const start = "/";
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/welcome/" aria-label="VYLOOP home">
          <Logo />
        </Link>
        <nav className="landing-links">
          <Link href="#features">Features</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#help">Help</Link>
        </nav>
        <div className="landing-actions">
          <button
            className="icon-button"
            onClick={() =>
              setTheme(
                document.documentElement.dataset.theme === "light"
                  ? "dark"
                  : "light",
              )
            }
            aria-label="Toggle theme"
          >
            {data.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <Link href="/" className="btn btn-ghost">
            Open workspace
          </Link>
          <Link href={start} className="btn btn-primary">
            Get started <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-kicker">
            <Sparkles size={12} />A little progress. A whole lot of possibility.
          </div>
          <h1>
            Your life. Your levels.
            <br />
            <span>Your rules.</span>
          </h1>
          <p>
            Turn everyday progress into real achievements. Build better habits,
            master your money, and level up with VYLOOP.
          </p>
          <div className="hero-ctas">
            <Link href={start} className="btn btn-primary">
              Start your journey <ArrowRight size={16} />
            </Link>
            <Link href="/#tutorial" className="btn btn-secondary">
              <Compass size={16} />
              See the quick guide
            </Link>
          </div>
          <span className="hero-note">
            No account. No password. Start with your name.
          </span>
          <div className="landing-preview">
            <div className="preview-chrome">
              <div>
                <i className="preview-dot" />
                <i className="preview-dot" />
                <i className="preview-dot" />
              </div>
              <span>vyloop. / your workspace</span>
              <Badge tone="mint">
                Your personal workspace
              </Badge>
            </div>
            <div className="preview-main">
              <h2>
                Your everyday, upgraded<span className="violet">.</span>
              </h2>
              <WelcomeBanner
                level={levelInfo(totalXP(data)).level}
                onExplore={() => router.push("/#lifeloop")}
              />
              <DashboardStats data={data} />
            </div>
          </div>
        </section>
        <section className="landing-section" id="features">
          <div className="landing-section-heading">
            <div className="eyebrow">TWO LOOPS. ONE BETTER EVERYDAY.</div>
            <h2>
              A little structure for
              <br />
              the life you want.
            </h2>
            <p>
              Connect the things you do today with the person you’re becoming.
              Your habits and your finances finally share the same space.
            </p>
          </div>
          <div className="landing-features">
            <Card>
              <div className="icon-box violet">
                <Target size={23} />
              </div>
              <h3>Build your LifeLoop.</h3>
              <p>
                Learn something new, make time to move, or finish that side
                project. Turn your intentions into doable quests and a streak
                worth keeping.
              </p>
              <Link
                href="/#lifeloop"
                className="text-link violet"
                style={{ marginTop: 22 }}
              >
                Find your next quest <ArrowRight />
              </Link>
            </Card>
            <Card>
              <div className="icon-box mint">
                <Wallet size={23} />
              </div>
              <h3>Master your MoneyLoop.</h3>
              <p>
                Give every rupee a little direction. Track spending, build a
                budget that fits your life, and save for the things that matter
                to you.
              </p>
              <Link
                href="/#moneyloop"
                className="text-link mint"
                style={{ marginTop: 22 }}
              >
                Make a money plan <ArrowRight />
              </Link>
            </Card>
            <Card>
              <div className="icon-box orange">
                <Zap size={23} />
              </div>
              <h3>See your progress add up.</h3>
              <p>
                One shared XP system rewards your effort across both loops.
                Unlock skills and badges as you build the story of your
                progress.
              </p>
              <Link
                href="/#achievements"
                className="text-link orange"
                style={{ marginTop: 22 }}
              >
                Meet your milestones <ArrowRight />
              </Link>
            </Card>
          </div>
        </section>
        <div className="landing-subtle-bg">
          <section className="landing-section" id="how-it-works">
            <div className="landing-section-heading">
              <div className="eyebrow">LESS OVERTHINKING. MORE DOING.</div>
              <h2>Three simple steps to get started.</h2>
              <p>
                Enter your name, choose any optional goals, and start.
                A short tutorial shows you around.
              </p>
            </div>
            <div className="landing-steps">
              <div>
                <div className="landing-step-number">
                  01<span className="muted"> /</span>
                </div>
                <h3>Pick a quest.</h3>
                <p>
                  Open LifeLoop. Choose a small task for today, then select
                  Complete quest when you finish it. A quest is simply a task
                  that earns you progress points.
                </p>
              </div>
              <div>
                <div className="landing-step-number">
                  02<span className="muted"> /</span>
                </div>
                <h3>Log an expense.</h3>
                <p>
                  Open MoneyLoop and select Add expense. Enter what you spent,
                  the amount, and a category. Set a monthly budget whenever you
                  are ready.
                </p>
              </div>
              <div>
                <div className="landing-step-number">
                  03<span className="muted"> /</span>
                </div>
                <h3>See your progress.</h3>
                <p>
                  Return to Overview to see your points, level, daily streak,
                  and spending. XP means progress points. Small actions add up
                  over time.
                </p>
              </div>
            </div>
            <div className="hero-ctas" style={{ marginTop: 30 }}>
              <Link href="/#tutorial" className="btn btn-secondary">
                <Compass size={16} /> Show me the tutorial
              </Link>
            </div>
          </section>
        </div>
        <section className="landing-section">
          <div className="landing-dual">
            <div>
              <div className="eyebrow">A SPACE THAT BELONGS TO YOU</div>
              <h2>Your pace.<br />Your personal progress.</h2>
              <p>Build habits, learn skills, and track your money in one place. Just enter your name. Everything else is optional.</p>
              <div className="landing-bullet"><Check /> No email or password</div>
              <div className="landing-bullet"><Check /> Start with zero progress and your own records</div>
              <div className="landing-bullet"><ShieldCheck /> Saved in this browser on this device</div>
              <Link href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>Open my workspace <ArrowRight size={16} /></Link>
            </div>
            <Card style={{ padding: 28 }}>
              <SectionHeading title="Keep your progress with you" subtitle="A simple backup when you need it." action={<ShieldCheck size={19} className="violet" />} />
              <p>Use Settings → Export to download a copy of your name, quests, and money records. Use Restore backup to continue in another browser.</p>
              <p className="muted" style={{ marginTop: 18 }}>Anyone using the same browser profile can open your workspace. Clearing site data removes local records, so keep a backup.</p>
            </Card>
          </div>
        </section>
        <section
          className="landing-section"
          id="about"
          style={{ paddingTop: 20 }}
        >
          <div className="landing-dual">
            <Card style={{ padding: "32px" }}>
              <div
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems: "center",
                  marginBottom: 25,
                }}
              >
                <div className="icon-box">
                  <GitBranch size={23} />
                </div>
                <div>
                  <h3>More than a checklist.</h3>
                  <span className="muted text-sm">
                    A collection of becoming.
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  gap: 15,
                  padding: "20px 0 28px",
                }}
              >
                {[
                  { icon: Zap, label: "First step", color: "violet" },
                  { icon: Flame, label: "Consistency", color: "orange" },
                  { icon: Trophy, label: "Your next win", color: "mint" },
                ].map((b) => (
                  <div key={b.label} style={{ textAlign: "center" }}>
                    <div
                      className={`achievement-medal ${b.color}`}
                      style={{ width: 62, height: 67, marginBottom: 13 }}
                    >
                      <b.icon size={27} />
                    </div>
                    <span style={{ fontSize: 10 }}>{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="landing-quote">
                You don’t have to do it all.
                <br />
                <strong>Just do your next good thing.</strong>
              </div>
            </Card>
            <div>
              <div className="eyebrow">DESIGNED FOR REAL LIFE</div>
              <h2>
                Ambitious about you.
                <br />
                Gentle about the process.
              </h2>
              <p>
                Student life is a lot. So is figuring out what comes next.
                VYLOOP gives you one calm space to build habits, learn skills,
                and make sense of your money.
              </p>
              <p>
                XP rewards meaningful effort. Spending more never earns more.
                Missing a day never defines you. And an over-budget month is a
                reason to adjust your plan, not judge yourself.
              </p>
              <Link href={start} className="btn btn-primary">
                Find your rhythm <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section
          className="landing-section"
          id="help"
          style={{ paddingTop: 35 }}
        >
          <div className="landing-section-heading">
            <div className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</div>
            <h2>Before you join the loop.</h2>
          </div>
          <div className="landing-faq">
            <details open>
              <summary>Where should I start?</summary>
              <p>
                Start with one LifeLoop quest, then add one MoneyLoop expense.
                The short tutorial shows you where everything is. You can open
                it again anytime with the question mark Help button in the app.
              </p>
              <p>
                <Link href="/#tutorial" className="text-link violet">
                  Open the tutorial <ArrowRight size={14} />
                </Link>
              </p>
            </details>
            <details><summary>Do I need an account?</summary><p>No. Enter a name and start. Goals, interests, budget, and a savings target are optional. No email, password, or sign-in is needed.</p></details>
            <details><summary>Do I need to connect my bank?</summary><p>No. You record expenses and savings yourself. VYLOOP does not connect to your bank, move money, or process payments.</p></details>
            <details><summary>How does XP work?</summary><p>XP means experience points. Complete quests or reach savings milestones to earn points and increase your level. Each reward is recorded once. Adding an expense does not earn XP.</p></details>
            <details><summary>Where is my data kept?</summary><p>Your records stay in this browser on this device. Someone using the same browser profile can open them. There is no automatic sync. Clearing site data removes your progress.</p></details>
            <details><summary>Can I move my records to another device?</summary><p>Yes. In Settings, export a JSON backup. Open VYLOOP in the other browser and use Settings → Restore backup. Restoring replaces that browser’s current records after you confirm.</p></details>
            <details><summary>Can I export or delete my data?</summary><p>Yes. Use Settings → Export or Delete data. MoneyLoop also exports the selected month’s expenses as a spreadsheet-friendly CSV.</p></details>
          </div>
        </section>
        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="landing-cta">
            <div className="eyebrow">YOUR NEXT GOOD THING IS WAITING</div>
            <h2>A little progress looks good on you.</h2>
            <p>Make today the start of your next chapter.</p>
            <Link href={start} className="btn btn-primary">
              Start your journey <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/welcome/">
          <Logo />
        </Link>
        <span className="muted">Your life. Your levels. Your rules.</span>
        <div>
          <Link href="#features">Features</Link>
          <Link href="#help">Help</Link>
          <Link href="/#settings">Your privacy</Link>
          <Link href="/">Open workspace</Link>
        </div>
      </footer>
    </div>
  );
}
