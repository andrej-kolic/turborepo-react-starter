/**
 * Asset imports page route (`/demo/asset-imports`). Its component is in `asset-imports.lazy.tsx`,
 * so it loads in its own file.
 */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/demo/asset-imports')();
