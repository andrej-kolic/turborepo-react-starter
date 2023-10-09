import React from "react";
import { Card } from "ui";
import "./styles.css";
import TurboRepoImg from "./assets/turborepo.svg";

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): JSX.Element {
  return (
    <div className="AppCore">
      <img alt="Turborepo" src={TurboRepoImg} />
      <Card {...props} />
      <a href="readme.txt" target="_blank">Readme</a>
    </div>
  );
}
