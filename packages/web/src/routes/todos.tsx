/** Todo page route (`/todos`): loads the todos. Its component is in `todos.lazy.tsx`, so it loads in its own file. */

import { createFileRoute } from '@tanstack/react-router';
import { apiBaseUrl } from '../api';
import { startMockApi } from '../optional-features';

export const Route = createFileRoute('/todos')({
  loader: async () => {
    // import(): a static import would put @repo/core and Zod in the scripts every page loads first.
    const [{ getTodos }] = await Promise.all([
      import('@repo/core'),
      startMockApi(),
    ]);
    return getTodos(apiBaseUrl);
  },
});
