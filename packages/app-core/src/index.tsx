import React from 'react';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { Header } from './components/Header';
import { debugLog } from './utils/debug';
import { ResourceCards } from './components/ResourceCards';
import { Scroller } from './components/Scroller';

import '@repo/ui/theme.css';
import './styles.css';

// demo: keeps a type import from @repo/commons
const ct: CustomType = { _type: 'test' };
console.log('* custom type:', ct);

// demo: keeps a runtime import from @repo/ui
console.log('* 1 + 2:', add(1, 2));

// demo: triggers the no-underscore-dangle lint warning
const _orphan = 1;

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): React.JSX.Element {
  debugLog();

  return (
    <main className="AppCore">
      <Header title={props.title} />

      <ResourceCards />

      <Scroller />
    </main>
  );
}

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
