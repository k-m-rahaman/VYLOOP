export const STORAGE_WARNING =
  "This browser cannot save your changes. Keep this tab open and export your data in Settings before leaving.";

export function saveBrowserSnapshot(
  getStorage: () => Pick<Storage, "setItem">,
  key: string,
  snapshot: unknown,
): string | null {
  try {
    getStorage().setItem(key, JSON.stringify(snapshot));
    return null;
  } catch {
    return STORAGE_WARNING;
  }
}
