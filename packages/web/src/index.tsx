import React from 'react';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { RouterProvider } from '@tanstack/react-router';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppErrorDemo } from './components/AppErrorDemo';
import { router } from './router';

import '@repo/ui/theme.css';
import './styles.css';
import './env-guards';

// demo: keeps a type import from @repo/commons
const ct: CustomType = { _type: 'test' };
console.log('* custom type:', ct);

// demo: keeps a runtime import from @repo/ui
console.log('* 1 + 2:', add(1, 2));

// demo: triggers the no-underscore-dangle lint warning
const _orphan = 1;

type WebAppProps = {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
};

export function WebApp(props: WebAppProps): React.JSX.Element {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} context={{ title: props.title }} />
      <AppErrorDemo />
    </AppErrorBoundary>
  );
}

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
