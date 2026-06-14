import { CheckoutHandoff } from "../CheckoutHandoff";
import { OFFER_STATUS } from "@/lib/site";

export const metadata = {
  title: "Pilot Checkout | TraceReady",
  description: "TraceReady 5-file pilot checkout handoff before Stripe payment.",
};

export default function PilotCheckoutPage() {
  return (
    <CheckoutHandoff
      title="TraceReady 5-file pilot"
      price={OFFER_STATUS.pilot.price}
      description="Check and clean up to five related supplier files for an importer, exporter, cooperative, or compliance consultant."
      stripeHref={OFFER_STATUS.pilot.stripeHref}
      nextSteps={[
        "Pay through the TraceReady Stripe checkout operated by Passive Print Labs LLC.",
        "Use the order intake checklist to email up to five source files with receipt email, commodity, source countries, deadline, and buyer requirements.",
        "Receive a batch cleanup summary and cleaned packs after payment and usable file receipt.",
      ]}
    />
  );
}
