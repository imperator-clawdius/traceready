import { CheckoutHandoff } from "../CheckoutHandoff";
import { OFFER_STATUS } from "@/lib/site";

export const metadata = {
  title: "Cleanup Checkout | TraceReady",
  description: "TraceReady 24-hour cleanup checkout handoff before Stripe payment.",
};

export default function CleanupCheckoutPage() {
  return (
    <CheckoutHandoff
      title="TraceReady 24-hour cleanup"
      price={OFFER_STATUS.cleanup.price}
      description="Clean and validate one messy coffee or cocoa farm CSV, KML, or GeoJSON file into a buyer-ready ZIP handoff."
      stripeHref={OFFER_STATUS.cleanup.stripeHref}
      nextSteps={[
        "Send a scope note first with file type, commodity, source country, rough row count, deadline, and buyer requirements.",
        "Pay through the TraceReady Stripe checkout operated by Passive Print Labs LLC only after launch scope is confirmed.",
        "Use the order intake checklist after scope confirmation to email the source file, receipt email, commodity, source country, deadline, and buyer requirements.",
        "Receive the cleaned ZIP pack within 24 hours after scope confirmation, payment, and usable file receipt.",
      ]}
    />
  );
}
