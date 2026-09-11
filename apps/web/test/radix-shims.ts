// jsdom (jest 29) lacks the pointer-capture APIs Radix primitives call in
// their trigger/item pointerdown handlers, and scrollIntoView which is used
// when positioning popups. Guarded so real implementations win if jsdom
// ships them. Import for side effects in suites that render Radix widgets.
if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

// nwsapi (jsdom's selector engine) re-enters itself through
// matchesNative(":<state>") when asked to evaluate the `:modal`,
// `:fullscreen`, `:popover-open` and `:picture-in-picture` state
// pseudo-classes, recursing until the stack overflows and burning seconds of
// CPU per call. @floating-ui/dom — used by Radix Popper to position
// DropdownMenu content — checks exactly these pseudo-classes on open, which
// used to make userEvent clicks time out. Answer them directly from DOM
// state: nothing in jsdom is a popover, modal dialog, fullscreen or
// picture-in-picture element, so false is the correct response.
const statePseudoClasses =
  /:(popover-open|popover-target|modal|fullscreen|picture-in-picture)(^|[^\w-]|$)/;
const originalMatches = Element.prototype.matches;
Element.prototype.matches = function matches(selector: string) {
  if (typeof selector === "string" && statePseudoClasses.test(selector)) {
    return false;
  }
  return originalMatches.call(this, selector);
};
