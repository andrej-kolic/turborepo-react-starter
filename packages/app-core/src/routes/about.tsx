/** About page route (`/about`). Its component is in `about.lazy.tsx`, so it loads in its own file. */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')();
