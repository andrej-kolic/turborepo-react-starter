import React from "react";
import { screen, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Header } from "..";

describe("Card", () => {
  it("should render", () => {
    render(<Header />);

    expect(screen.getByText(/starter app/i)).toBeInTheDocument();
  });
});
