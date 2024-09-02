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
}): JSX.Element {
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
