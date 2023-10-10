import React from "react";
import { Card } from "ui";
import { Header } from "~/Header";
import "./styles.css";

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
