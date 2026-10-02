import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it("does not unlock the pilot with the cheaper cleanup URL", async () => {
  vi.stubEnv("NEXT_PUBLIC_PAID_ORDER_INTAKE_READY", "true");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK", "https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01");
  const { CheckoutHandoff } = await import("./CheckoutHandoff");
  const html = renderToStaticMarkup(<CheckoutHandoff title="TraceReady 5-file pilot" price="$745" description="Pilot" stripeHref="https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01" nextSteps={[]} />);
  expect(html).not.toContain("data-checkout-url");
  expect(html).toContain("Email scope request first");
});

it("renders the confirmed cleanup destination behind scope confirmation", async () => {
  vi.stubEnv("NEXT_PUBLIC_PAID_ORDER_INTAKE_READY", "true");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "");
  const { CheckoutHandoff } = await import("./CheckoutHandoff");
  const html = renderToStaticMarkup(<CheckoutHandoff title="TraceReady 24-hour cleanup" price="$149" description="Cleanup" stripeHref="https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01" nextSteps={[]} />);
  expect(html).toContain('data-checkout-url="https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01"');
  expect(html).toContain("Confirm scope to continue");
  expect(html).not.toContain('href="https://buy.stripe.com/');
});
