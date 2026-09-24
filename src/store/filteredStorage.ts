import type { StateStorage } from 'zustand/middleware';

/**
 * zustand `persist` saves on every `set()`, including hover, selection and each drag frame. This drops
 * writes whose value equals the last one saved, and all writes while `paused()` (a drag): the `set()`
 * that ends the pause saves the final state. No timer, so nothing is pending when the tab closes.
 */
export function filterWrites(storage: StateStorage, paused: () => boolean): StateStorage {
  const saved = new Map<string, string>();
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      if (paused() || saved.get(name) === value) return;
      saved.set(name, value);
      return storage.setItem(name, value);
    },
    removeItem: (name) => {
      saved.delete(name);
      return storage.removeItem(name);
    },
  };
}
