import { render, screen } from "@testing-library/react";

function Probe() {
  return <button type="button">probe</button>;
}

describe("web jest setup", () => {
  it("renders and uses jest-dom matchers", () => {
    render(<Probe />);
    expect(screen.getByRole("button", { name: "probe" })).toBeInTheDocument();
  });
});
