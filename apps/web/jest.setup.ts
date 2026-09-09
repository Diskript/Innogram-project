import "@testing-library/jest-dom";
import React from "react";

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver =
  ResizeObserverPolyfill as unknown as typeof ResizeObserver;

Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { src, alt = "" } = props as { src?: string; alt?: string };
    return React.createElement("img", { src, alt });
  },
}));
