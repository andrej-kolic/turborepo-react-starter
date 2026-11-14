import React from 'react';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { Header } from './components/Header';
import { debugLog } from './utils/debug';
import { ResourceCards } from './components/ResourceCards';
import { Scroller } from './components/Scroller';
import { AppErrorBoundary } from './components/AppErrorBoundary';

import '@repo/ui/theme.css';
import './styles.css';

// Every build must keep the first log and drop the second; `pnpm check:env-guards` checks the output.
// The log is the effect that stops the minifier from deleting the code even when the switch is on.
/* oxlint-disable no-console */
if (import.meta.env.APP_REACT_GUARD_ON) console.debug('env-guard:on');
if (import.meta.env.APP_REACT_GUARD_OFF) console.debug('env-guard:off');
/* oxlint-enable no-console */

// demo: keeps a type import from @repo/commons
const ct: CustomType = { _type: 'test' };
console.log('* custom type:', ct);

// demo: keeps a runtime import from @repo/ui
console.log('* 1 + 2:', add(1, 2));

// demo: triggers the no-underscore-dangle lint warning
const _orphan = 1;

type AppCoreProps = {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
};

function AppContent(props: AppCoreProps): React.JSX.Element {
  debugLog();

  return (
    <main className="AppCore">
      <Header title={props.title} />

      <ResourceCards />

      <Scroller />
    </main>
  );
}

export function AppCore(props: AppCoreProps): React.JSX.Element {
  return (
    <AppErrorBoundary>
      <AppContent {...props} />
    </AppErrorBoundary>
  );
}

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
