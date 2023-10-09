import React from "react";import { Card } from "ui";
import './styles.css';

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): JSX.Element {
  return <div className="AppCore"><Card {...props} /></div>
}
