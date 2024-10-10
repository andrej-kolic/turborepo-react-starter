import React from "react";
import { Card } from "@repo/ui";
import type { CustomType } from "@repo/commons";
import { Header } from "~app-core/Header";

import "./styles.css";

const ct: CustomType = { _type: "test" };
ct;

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): React.JSX.Element {

  // console.log("* process.env:", process.env);
  // console.log("* process.env.API_URL:", process.env.API_URL);

  console.log("* import.meta.env:", import.meta.env);

  // const t = import.meta.env.APP_REACT_TITLE;

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
