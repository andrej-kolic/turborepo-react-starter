const tst: number = "asd";
export const testFn = (name: string = "world") => {
  return `Hello ${name}`;
};

function component() {
  const element = document.createElement("div");

  element.innerHTML = ["Hello", "webpack"].join(" ");

  return element;
}

document.body.appendChild(component());
