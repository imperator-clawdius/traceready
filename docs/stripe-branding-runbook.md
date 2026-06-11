# Stripe branding runbook

Reviewed: 2026-06-11

The TraceReady site now routes paid CTAs through TraceReady-owned checkout handoff pages before sending buyers to Stripe:

- `/checkout/cleanup/`
- `/checkout/pilot/`

Those pages disclose that TraceReady is operated by Passive Print Labs LLC before the buyer continues to Stripe. This removes the surprise from the website flow, but the Stripe account itself still needs Dashboard branding aligned so the payment page does not look like a different product.

## Goal

Stripe checkout should read as TraceReady first, with Passive Print Labs LLC only as the legal operator/payment entity where Stripe requires it.

## Dashboard update checklist

In Stripe Dashboard for the account that owns the live payment links:

1. Open **Settings > Business > Public details**.
2. Set the public business name to `TraceReady`.
3. Set the support email to `founder@traceready.online`.
4. Set the support website to `https://traceready.online/`.
5. Set the statement descriptor to `TRACEREADY` if Stripe allows it.
6. Confirm the legal entity remains `Passive Print Labs LLC` where required for tax, payout, or compliance records.
7. Open the live product for the single-file cleanup and confirm the product name is `TraceReady 24-hour cleanup`.
8. Open the live product or payment link for the pilot and confirm the buyer-facing label includes `TraceReady 5-file importer pilot`.
9. Confirm both payment links still point to the correct prices:
   - Single-file cleanup: `$149`
   - 5-file importer pilot: `$745`

## Verification after update

Use an incognito browser or a clean browser profile and verify this exact path:

1. Visit `https://traceready.online/`.
2. Click `Buy 24-hour cleanup`.
3. Confirm `/checkout/cleanup/` shows:
   - `TraceReady 24-hour cleanup`
   - `TraceReady is operated by Passive Print Labs LLC`
   - `Stripe checkout may show Passive Print Labs LLC`
4. Click `Continue to Stripe checkout`.
5. Confirm the Stripe page does not show an unrelated product, unrelated brand, or unrelated account name.
6. Repeat for `Buy 5-file pilot - $745`.

Run the repo gate after the Dashboard update:

```powershell
npm run verify:launch
```

This confirms the TraceReady pages and Stripe links still respond, but final visual confirmation of Stripe branding must be done in the rendered Stripe checkout page because Stripe does not expose the rendered brand text through the static HTML response.

## If Stripe cannot show TraceReady as the primary name

Keep the TraceReady checkout handoff pages as the primary paid path and do not link directly to `buy.stripe.com` from the homepage or terms page. The acceptable fallback is:

- TraceReady page first.
- Explicit legal-operator disclosure before payment.
- Stripe only after the buyer understands that Passive Print Labs LLC is the payment/legal operator.

Do not revert to direct homepage-to-Stripe CTAs unless the Stripe account branding is visibly aligned with TraceReady.
