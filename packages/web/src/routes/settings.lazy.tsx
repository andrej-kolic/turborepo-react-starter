/** Settings page (`/settings`): edits the settings, which are saved in the browser as they change. */

import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import { useSettings } from '../settings';

export const Route = createLazyFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage(): React.JSX.Element {
  const { username, hideCompleted, setUsername, setHideCompleted } =
    useSettings((state) => state);

  return (
    <section
      className="SettingsPage"
      aria-label="Settings"
      data-testid="settings-page"
    >
      <h1>Settings</h1>
      <label>
        Username{' '}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={(event) => setHideCompleted(event.target.checked)}
        />
        Hide completed todos
      </label>
    </section>
  );
}
