import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { createSettingsStore } from '../settings/store';

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    storage: {
      getItem: (name) => items.get(name) ?? null,
      setItem: (name, value) => void items.set(name, value),
      removeItem: (name) => void items.delete(name),
    } satisfies StateStorage,
  };
}

describe('createSettingsStore', () => {
  it('starts with no username and completed todos shown', () => {
    const { storage } = memoryStorage();

    expect(createSettingsStore(storage).getState()).toMatchObject({
      username: '',
      hideCompleted: false,
    });
  });

  it('saves the settings to the storage, without the setters', () => {
    const { items, storage } = memoryStorage();
    const store = createSettingsStore(storage);

    store.getState().setUsername('Ana');
    store.getState().setHideCompleted(true);

    expect(JSON.parse(items.get('settings') ?? '{}')).toEqual({
      state: { username: 'Ana', hideCompleted: true },
      version: 0,
    });
  });

  it('loads settings saved by an earlier store', () => {
    const { storage } = memoryStorage();
    createSettingsStore(storage).getState().setUsername('Ana');

    expect(createSettingsStore(storage).getState().username).toBe('Ana');
  });

  it('keeps the defaults when the saved settings are not valid', () => {
    const { storage } = memoryStorage({
      settings: JSON.stringify({
        state: { username: 'Ana', hideCompleted: 'yes' },
        version: 0,
      }),
    });

    expect(createSettingsStore(storage).getState()).toMatchObject({
      username: '',
      hideCompleted: false,
    });
  });

  it('loads settings from async storage once it answers', async () => {
    const { storage } = memoryStorage({
      settings: JSON.stringify({ state: { username: 'Ana' }, version: 0 }),
    });
    const store = createSettingsStore({
      ...storage,
      getItem: (name) => Promise.resolve(storage.getItem(name)),
    });

    await store.persist.rehydrate();

    expect(store.getState().username).toBe('Ana');
  });
});
