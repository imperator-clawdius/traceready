import { CheckoutHandoff } from "../CheckoutHandoff";

const STRIPE_CLEANUP_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01";

export const metadata = {
  title: "Cleanup Checkout | TraceReady",
  description: "TraceReady 24-hour cleanup checkout handoff before Stripe payment.",
};

export default function CleanupCheckoutPage() {
  return (
    <CheckoutHandoff
      title="TraceReady 24-hour cleanup"
      price="$149"
      description="Clean and validate one messy coffee or cocoa farm CSV, KML, or GeoJSON file into a buyer-ready ZIP handoff."
      stripeHref={STRIPE_CLEANUP_LINK}
      nextSteps={[
        "Pay through the TraceReady Stripe checkout operated by Passive Print Labs LLC.",
        "Email the source file, commodity, source country, deadline, and buyer summary.",
        "Receive the cleaned ZIP pack within 24 hours after payment and usable file receipt.",
      ]}
    />
  );
}
