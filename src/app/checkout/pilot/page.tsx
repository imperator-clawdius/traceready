import { CheckoutHandoff } from "../CheckoutHandoff";

const STRIPE_PILOT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK || "https://buy.stripe.com/3cIdRbc8g9OX3BL1WZ93y02";

export const metadata = {
  title: "Pilot Checkout | TraceReady",
  description: "TraceReady 5-file pilot checkout handoff before Stripe payment.",
};

export default function PilotCheckoutPage() {
  return (
    <CheckoutHandoff
      title="TraceReady 5-file pilot"
      price="$745"
      description="Check and clean up to five related supplier files for an importer, exporter, cooperative, or compliance consultant."
      stripeHref={STRIPE_PILOT_LINK}
      nextSteps={[
        "Pay through the TraceReady Stripe checkout operated by Passive Print Labs LLC.",
        "Email up to five source files with commodity, source countries, deadline, and buyer requirements.",
        "Receive a batch cleanup summary and cleaned packs after payment and usable file receipt.",
      ]}
    />
  );
}
