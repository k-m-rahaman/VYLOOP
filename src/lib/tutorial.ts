export const TUTORIAL_VERSION = 1;

export type TutorialScope = {
  mode: "personal" | "demo" | "cloud";
  userId?: string;
};

export type TutorialStatus = "completed" | "dismissed";
export type TutorialStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function preferenceKey(scope: TutorialScope): string | null {
  if (scope.mode === "personal") return "vyloop:tutorial:personal";
  if (scope.mode === "demo") return "vyloop:tutorial:demo";
  if (!scope.userId) return null;
  return `vyloop:tutorial:account:${encodeURIComponent(scope.userId)}`;
}

function availableStorage(
  storage?: TutorialStorage | null,
): TutorialStorage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A skipped guide stays skipped for this browser and account until a new version. */
export function shouldShowTutorial(
  scope: TutorialScope,
  storage?: TutorialStorage | null,
): boolean {
  const key = preferenceKey(scope);
  if (!key) return false;
  try {
    const value = availableStorage(storage)?.getItem(key);
    if (!value) return true;
    const preference = JSON.parse(value);
    return (
      typeof preference !== "object" ||
      preference === null ||
      Array.isArray(preference) ||
      preference.version !== TUTORIAL_VERSION ||
      (preference.status !== "completed" && preference.status !== "dismissed")
    );
  } catch {
    return true;
  }
}

export function saveTutorialPreference(
  scope: TutorialScope,
  status: TutorialStatus,
  storage?: TutorialStorage | null,
): boolean {
  const key = preferenceKey(scope);
  const target = availableStorage(storage);
  if (!key || !target) return false;
  try {
    target.setItem(key, JSON.stringify({ version: TUTORIAL_VERSION, status }));
    return true;
  } catch {
    return false;
  }
}

export function resetTutorialPreference(
  scope: TutorialScope,
  storage?: TutorialStorage | null,
): boolean {
  const key = preferenceKey(scope);
  const target = availableStorage(storage);
  if (!key || !target) return false;
  try {
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
