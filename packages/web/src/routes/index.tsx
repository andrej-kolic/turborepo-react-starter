/** Home page route (`/`). Its component is in `index.lazy.tsx`, so it loads in its own file. */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')();
