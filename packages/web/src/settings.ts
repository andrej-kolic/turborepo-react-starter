/** The app's settings store, saved in `localStorage`, and the hook pages read it with. */

import { useStore } from 'zustand';
import { createSettingsStore, type SettingsState } from '@repo/core';

export const settingsStore = createSettingsStore(localStorage);

/** The part of the settings `selector` picks; the page re-renders when it changes. */
export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
