/** The user's settings, kept in a Zustand store that saves them to the storage each app passes in. */

import * as z from 'zod';
import { createStore } from 'zustand/vanilla';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

const settingsSchema = z.object({
  /** Shown in the todo page's heading; empty shows "My todos". */
  username: z.string(),
  hideCompleted: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export type SettingsState = Settings & {
  setUsername: (username: string) => void;
  setHideCompleted: (hideCompleted: boolean) => void;
};

/**
 * A settings store saved to `storage` under the key `settings`: `localStorage` on the web,
 * AsyncStorage on React Native, a file for a CLI. With async storage, saved settings load after the store is made.
 * Saved settings with a wrong type, such as `hideCompleted: "yes"`, are ignored and the defaults kept; a missing one keeps its default.
 * React reads it with Zustand's `useStore`, other code with `getState()`.
 */
export function createSettingsStore(storage: StateStorage) {
  return createStore<SettingsState>()(
    persist(
      (set) => ({
        username: '',
        hideCompleted: false,
        setUsername: (username) => set({ username }),
        setHideCompleted: (hideCompleted) => set({ hideCompleted }),
      }),
      {
        name: 'settings',
        storage: createJSONStorage(() => storage),
        partialize: ({ username, hideCompleted }): Settings => ({
          username,
          hideCompleted,
        }),
        merge: (saved, current) => {
          const result = settingsSchema.partial().safeParse(saved);
          return result.success ? { ...current, ...result.data } : current;
        },
      },
    ),
  );
}
