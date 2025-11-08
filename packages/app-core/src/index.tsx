import React from 'react';
import { Card } from '@repo/ui';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { Header } from './Header';

import './styles.css';
import LinkIcon from './assets/link.svg';
import { debugLog } from './utils/debug';

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

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <Card title="Embedded image">
          <div>{"import Icon from 'pic.svg'"}</div>
        </Card>

        <Card
          title="Public image"
          image={<img src="images/image-file.svg" alt="icon" />}
        >
          <div>{'<img src="images/pic.svg" />'}</div>
        </Card>

        <Card
          title="Css image"
          image={<div className="AppCore__card-image"></div>}
        >
          <div>{"background-image: url('./assets/pic.svg')"}</div>
        </Card>

        <Card
          title="Public resource"
          image={
            <img src={LinkIcon} style={{ position: 'relative', top: 3 }} />
          }
        >
          <a href="readme.txt" target="_blank" rel="noopener">
            Readme
          </a>
        </Card>
      </div>
    </div>
  );
}

// TODO: remove - example of lint warning for eslint-plugin-react-refresh
export const foo = () => {
  //
};
