import { init } from 'app-core';
// import { Card } from "ui";

// const tst: number = "asd";

export const testFn = (name: string = "world") => {
  return `Hello ${name}`;
};

function component() {
  const element = document.createElement("div");

  element.innerHTML = ["Hello", "webpack"].join(" ");

  return element;
}

export function init2() {
    document.body.appendChild(component());
}

init();