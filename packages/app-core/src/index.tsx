import React from "react";
import { Card } from "@repo/ui";
import type { CustomType } from "@repo/commons";
import { Header } from "~app-core/Header";

import "./styles.css";
import { getEnvironmentVariables } from "./utils/environment";

// TODO remove
const ct: CustomType = { _type: "test" };
console.log('* custom type:', ct);

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
  console.log("* import.meta.env:", import.meta.env);
  console.log("* getEnvironmentVariables():", getEnvironmentVariables());

  console.log("* import.meta.env.BUNDLER:", import.meta.env.BUNDLER);
  console.log("* import.meta.env.APP_REACT_TITLE:", import.meta.env.APP_REACT_TITLE);
  console.log("* import.meta.env.APP_REACT_ENV_FILE:", import.meta.env.APP_REACT_ENV_FILE);

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
      <Header />
      <Card {...props} />
      <a href="readme.txt" target="_blank">
        Readme
      </a>
    </div>
  );
}
