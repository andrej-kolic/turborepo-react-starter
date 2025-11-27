import React from 'react';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { Header } from './components/Header';
import { debugLog } from './utils/debug';
import { ResourceCards } from './components/ResourceCards';

import './styles.css';
import { Scroller } from './components/Scroller';

// TODO remove
/* _eslint no-console: "error" */

// TODO remove
const ct: CustomType = { _type: 'test' };
console.log('* custom type:', ct);

// TODO remove
console.log('* 1 + 2:', add(1, 2));

const _orphan = 1;

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): React.JSX.Element {
  debugLog();

  return (
    <div className="AppCore">
      <Header title={props.title} />

      <ResourceCards />

      <Scroller />
    </div>
  );
}

// TODO: remove - example of lint warning for eslint-plugin-react-refresh
export const foo = () => {
  //
};
