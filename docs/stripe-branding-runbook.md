# Stripe branding runbook

Reviewed: 2026-06-11

The TraceReady site now routes paid CTAs through TraceReady-owned checkout handoff pages before sending buyers to Stripe:

- `/checkout/cleanup/`
- `/checkout/pilot/`

Those pages disclose that TraceReady is operated by Passive Print Labs LLC before the buyer continues to Stripe. The active TraceReady checkout links now live under the TraceReady-branded Stripe account rather than the shared SuiteScrape/PactLock account.

## Goal

Stripe checkout should read as TraceReady first, with Passive Print Labs LLC only as the legal operator/payment entity where Stripe requires it.

## Verified Dashboard state

- Legal entity remains `Passive Print Labs LLC`.
- Public business name is `TraceReady`.
- Support email is `founder@traceready.online`.
- Website is `https://traceready.online/`.
- Statement descriptor is `TRACEREADY`.
- Cleanup checkout link: `https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01`.
- Pilot checkout link: `https://buy.stripe.com/3cIdRbc8g9OX3BL1WZ93y02`.
- Optional Stripe logo/wordmark asset for later upload: `/traceready-stripe-wordmark.png`.

Do not change shared legal-entity fields. Passive Print Labs LLC remains the legal operator.

## Verification after update

Use an incognito browser or a clean browser profile and verify this exact path:

1. Visit `https://traceready.online/`.
2. Click `Buy 24-hour cleanup`.
3. Confirm `/checkout/cleanup/` shows:
   - `TraceReady 24-hour cleanup`
   - `TraceReady is operated by Passive Print Labs LLC`
   - `TraceReady checkout is branded as TraceReady`
4. Click `Continue to Stripe checkout`.
5. Confirm the Stripe page header is `TraceReady`.
6. Repeat for `Buy 5-file pilot - $745`.

Run the repo gate after the Dashboard update:

```powershell
npm run verify:launch
```

This confirms the TraceReady pages and Stripe links still respond. Final visual confirmation of Stripe branding should still be done in the rendered Stripe checkout page because Stripe does not expose the rendered brand text through the static HTML response.

## If Stripe cannot show TraceReady as the primary name

Keep the TraceReady checkout handoff pages as the primary paid path and do not link directly to `buy.stripe.com` from the homepage or terms page. The acceptable fallback is:

- TraceReady page first.
- Explicit legal-operator disclosure before payment.
- Stripe only after the buyer understands that Passive Print Labs LLC is the payment/legal operator.

Do not revert to direct homepage-to-Stripe CTAs unless the Stripe account branding is visibly aligned with TraceReady.
