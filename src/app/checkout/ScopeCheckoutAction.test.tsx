import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ScopeCheckoutAction } from "./ScopeCheckoutAction";

it("requires scope confirmation before revealing the exact Stripe destination and can be revoked", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<ScopeCheckoutAction stripeHref="https://buy.stripe.com/verified123" />));
    const confirmation = container.querySelector("input")!;
    expect(confirmation.required).toBe(true);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("button")?.disabled).toBe(true);
    act(() => confirmation.click());
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://buy.stripe.com/verified123");
    act(() => confirmation.click());
    expect(container.querySelector("a")).toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
