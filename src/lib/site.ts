export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";
export const LEGAL_OPERATOR = "Passive Print Labs LLC";

export const SAMPLE_PACK_HREF = "/traceready-sample-output.zip";
export const PUBLIC_PILOT_PACK_HREF = "/traceready-public-cocoa-pilot-pack.zip";
export const CHECKOUT_CLEANUP_HREF = "/checkout/cleanup/";
export const CHECKOUT_PILOT_HREF = "/checkout/pilot/";
export const ORDER_INTAKE_HREF = "/order-intake/";
export const METHODOLOGY_HREF = "/methodology/";
export const PROOF_HREF = "/proof/";
export const PUBLIC_PILOT_CASE_HREF = "/proof/public-cocoa-pilot/";
export const PILOT_PROOF_HREF = "/pilot-proof/";
export const CONTACT_HREF = "/contact/";
export const FILE_TRIAGE_HREF = "/file-triage/";
export const FIELD_NOTE_EUDR_FILE_ERRORS_HREF = "/field-notes/eudr-file-errors/";

export const STRIPE_CLEANUP_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01";

export const STRIPE_PILOT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK || "https://buy.stripe.com/dRm6oH9SH8l671l59W8IU03";

export const OFFER_STATUS = {
  cleanup: {
    title: "TraceReady 24-hour cleanup",
    price: "$149",
    stripeHref: STRIPE_CLEANUP_LINK,
  },
  pilot: {
    title: "TraceReady 5-file pilot",
    price: "$745",
    stripeHref: STRIPE_PILOT_LINK,
  },
  verifiedDate: "2026-06-14",
};
