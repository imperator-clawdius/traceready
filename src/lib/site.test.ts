import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it("enables the verified cleanup only and keeps the inactive pilot unavailable", async () => {
  vi.stubEnv("NEXT_PUBLIC_PAID_ORDER_INTAKE_READY", "true");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK", "");
  const { OFFER_STATUS } = await import("./site");
  expect(OFFER_STATUS.cleanup.checkoutReady).toBe(true);
  expect(OFFER_STATUS.pilot.checkoutReady).toBe(false);
});

it("never enables an unverified replacement payment link", async () => {
  vi.stubEnv("NEXT_PUBLIC_PAID_ORDER_INTAKE_READY", "true");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "https://buy.stripe.com/replacement");
  const { OFFER_STATUS } = await import("./site");
  expect(OFFER_STATUS.cleanup.checkoutReady).toBe(false);
});

it("allows all purchase links to be disabled at build time", async () => {
  vi.stubEnv("NEXT_PUBLIC_PAID_ORDER_INTAKE_READY", "false");
  const { OFFER_STATUS } = await import("./site");
  expect(OFFER_STATUS.cleanup.checkoutReady).toBe(false);
  expect(OFFER_STATUS.pilot.checkoutReady).toBe(false);
});
