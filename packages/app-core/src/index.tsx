import React from 'react';
import { Card } from '@repo/ui';
import { add } from '@repo/ui/utils';
import type { CustomType } from '@repo/commons';
import { Header } from './Header';

import './styles.css';
import { getEnvironmentVariables } from './utils/environment';

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
  // console.log("* process.env:", process.env);
  // console.log("* process.env.APP_REACT_TITLE:", process.env.APP_REACT_TITLE);
  // console.log("* process.env.HOME:", process.env.HOME);

  // console.log("* import.meta:", import.meta);
  console.log('* import.meta.env:', import.meta.env);
  console.log('* getEnvironmentVariables():', getEnvironmentVariables());

  console.log(
    '* import.meta.env.BUILD_ENVIRONMENT:',
    import.meta.env.BUILD_ENVIRONMENT,
  );
  console.log('* import.meta.env.BUNDLER:', import.meta.env.BUNDLER);
  console.log('* import.meta.env.MODE:', import.meta.env.MODE);
  console.log(
    '* import.meta.env.APP_REACT_TITLE:',
    import.meta.env.APP_REACT_TITLE,
  );
  console.log(
    '* import.meta.env.APP_REACT_ENV_FILE:',
    import.meta.env.APP_REACT_ENV_FILE,
  );

  // // @ts-ignore - external
  // console.log("* import.meta.env.APP_REACT_ROOT_TEST:", import.meta.env.APP_REACT_ROOT_TEST, typeof import.meta.env.APP_REACT_ROOT_TEST, import.meta.env.APP_REACT_ROOT_TEST?.length);
  // // @ts-ignore - external
  // console.log("* import.meta.env.APP_REACT_HOME:", import.meta.env?.APP_REACT_HOME);
  // // @ts-ignore - excluded
  // console.log("* import.meta.env.HOME:", import.meta.env?.HOME);
  // // @ts-ignore - excluded
  // console.log("* import.meta.env.NO_PREFIX:", import.meta.env?.NO_PREFIX);

  return (
    <div className="AppCore">
      <Header title={props.title} />

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <Card title="Embedded image">
          <div>{"import Icon from 'pic.svg'"}</div>
        </Card>

        <Card
          title="Public folder image"
          image={<img src="images/image-file.svg" alt="icon" width={100} />}
        >
          <div>{'<img src="images/pic.svg" />'}</div>
        </Card>

        <Card
          title="Css image"
          image={<div className="AppCore__card-image"></div>}
        >
          <div>{"background-image: url('../public/pic.svg')"}</div>
        </Card>
      </div>

      <a href="readme.txt" target="_blank">
        Readme
      </a>
    </div>
  );
}

// TODO: remove - example of lint warning for eslint-plugin-react-refresh
export const foo = () => {
  //
};
