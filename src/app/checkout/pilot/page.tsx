import { CheckoutHandoff } from "../CheckoutHandoff";

const STRIPE_PILOT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK || "https://buy.stripe.com/8x24gz0i70SEgBVgSE8IU02";

export const metadata = {
  title: "Pilot Checkout | TraceReady",
  description: "TraceReady 5-file importer pilot checkout handoff before Stripe payment.",
};

export default function PilotCheckoutPage() {
  return (
    <CheckoutHandoff
      title="TraceReady 5-file importer pilot"
      price="$745"
      description="Triage and clean up to five related supplier files for an importer, exporter, cooperative, or compliance consultant."
      stripeHref={STRIPE_PILOT_LINK}
      nextSteps={[
        "Pay through Stripe after confirming the legal operator name.",
        "Email up to five source files with commodity, source countries, deadline, and buyer requirements.",
        "Receive a batch triage summary and cleaned packs after payment and usable file receipt.",
      ]}
    />
  );
}
