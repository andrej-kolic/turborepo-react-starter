import React from "react";
import TurboRepoImg from "../assets/turborepo.svg"; // TODO: report for bad path
import "./styles.css";

export function Header(): React.ReactNode {
  return (
    <div className="Header">
      <img alt="Turborepo" src={TurboRepoImg} />
      <h1>Starter app</h1>
    </div>
  );
}
