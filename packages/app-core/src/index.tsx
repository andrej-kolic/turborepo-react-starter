import React from "react";
import { Card } from "@repo/ui";
import type { CustomType } from "@repo/commons";
import { Header } from "~app-core/Header";

import "./styles.css";

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

  // console.log("* import.meta.env:", import.meta.env);
  // console.log("* import.meta.env.HOME:", import.meta.env.HOME);
  console.log("* import.meta.env.APP_REACT_TITLE:", import.meta.env.APP_REACT_TITLE);

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
