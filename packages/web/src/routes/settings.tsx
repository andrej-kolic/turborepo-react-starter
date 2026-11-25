/** Settings page route (`/settings`). Its component is in `settings.lazy.tsx`, so it loads in its own file. */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')();
