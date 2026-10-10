export const QUEST_CATEGORIES = [
  "Coding & Technology",
  "Learning",
  "Fitness",
  "Productivity",
  "Creativity",
  "Personal Development",
  "Financial Literacy",
] as const;
export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Education",
  "Shopping",
  "Entertainment",
  "Subscriptions",
  "Health",
  "Others",
] as const;
export type QuestCategory = (typeof QUEST_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Theme = "dark" | "light" | "system";
export interface Profile {
  name: string;
  goals: string[];
  interests: string[];
  dailyMinutes: number;
  onboarded: boolean;
  shareActivity: boolean;
  avatar?: string;
}
export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: Difficulty;
  xp: number;
  createdAt: string;
  deadline?: string;
  isCustom?: boolean;
  catalogKey?: string;
  day?: string;
}
export interface Completion {
  questId: string;
  completedAt: string;
  xp: number;
}
export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amountPaise: number;
  date: string;
  note?: string;
}
export interface Contribution {
  id: string;
  amountPaise: number;
  date: string;
}
export interface SavingsGoal {
  id: string;
  title: string;
  targetPaise: number;
  contributions: Contribution[];
  targetDate?: string;
}
export interface XPEvent {
  id: string;
  key: string;
  amount: number;
  date: string;
}
export interface SquadMember {
  id: string;
  name: string;
  joinedAt: string;
}
export interface SquadChallenge {
  id: string;
  title: string;
  target: number;
  completedBy: string[];
}
export interface Squad {
  id: string;
  name: string;
  code: string;
  members: SquadMember[];
  challenges: SquadChallenge[];
}
export interface AppState {
  profile: Profile;
  quests: Quest[];
  dailyQuestDays: string[];
  completions: Completion[];
  expenses: Expense[];
  budgetPaise: number;
  budgets: Record<string, number>;
  goals: SavingsGoal[];
  xpEvents: XPEvent[];
  theme: Theme;
  squads: Squad[];
}
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  earnedAt?: string;
}
export interface Skill {
  id: string;
  branch: string;
  title: string;
  description: string;
  required: number;
  progress: number;
  unlocked: boolean;
}
export type QuestInput = Omit<
  Quest,
  "id" | "createdAt" | "isCustom" | "xp" | "catalogKey" | "day"
> & { xp?: number };
export type ExpenseInput = Omit<Expense, "id"> & { id?: string };
export type GoalInput = Pick<
  SavingsGoal,
  "title" | "targetPaise" | "targetDate"
>;
