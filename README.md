# TraceReady

Clean and validate messy farm CSV, KML, and GeoJSON files into buyer-ready coffee and cocoa handoff packs for exporters and EU importers.

## MVP

- Browser-side file analysis for CSV, KML, GeoJSON, and JSON GeoJSON.
- Built-in sample runners for CSV, KML, and GeoJSON launch demos.
- Multi-file cleanup check for up to 5 supplier files, with a batch readiness summary and copyable pilot summary.
- Farm record normalization for supplier, country, commodity, batch, area, coordinates, and geometry.
- EUDR readiness checks for missing traceability fields, invalid coordinates, duplicate farm IDs, and polygon requirements for plots over 4 hectares.
- Downloadable ZIP pack with cleaned CSV, issue log, buyer summary, readiness report, normalized GeoJSON, structured EUDR checklist, and a paid-cleanup intake note.
- Public representative sample output pack at `/traceready-sample-output.zip`.
- Methodology, proof status, contact, and order intake pages for buyer due diligence before purchase.
- Paid cleanup CTAs route through TraceReady checkout handoff pages before Stripe so buyers see the legal-operator disclosure before payment.
- Privacy and terms pages linked from the product footer with retention, deletion, confidentiality, no-model-training, legal-operator, and no-certification language.

## Local

```bash
npm install
npm run lint
npm run test
npm run build
npm run check
npm run verify:launch
npm run dev
```

## GitHub Pages

The site statically exports to `out/` with `output: "export"` and deploys through `.github/workflows/pages.yml`.

Custom domain: `traceready.online`

## Conversion

The paid CTAs open `/checkout/cleanup/` and `/checkout/pilot/` first. Those pages keep the TraceReady name visible, explain that Passive Print Labs LLC operates the payment workflow, and then link to TraceReady-labeled Stripe products.

`NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is configured in GitHub Actions variables for the live $149 cleanup Payment Link. The checkout page also includes the public fallback link: `https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01`.

The 5-file pilot uses `NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK` when configured. The checkout page also includes the public fallback Payment Link: `https://buy.stripe.com/dRm6oH9SH8l671l59W8IU03`.

After checkout, the launch app prompts customers to use `/order-intake/` and email the source file, receipt email, commodity, source country, deadline, and buyer requirements so the paid cleanup order can be fulfilled manually. TraceReady is operated by Passive Print Labs LLC, and the Stripe checkout surface is labeled as TraceReady.

See `docs/launch-status.md` for the current deployment and DNS checklist.

See `docs/product-plan.md` for future commodity presets, expansion options, and pivot paths.

See `docs/investor-readiness.md` for the buyability gates, commercial ladder, and evidence to capture before treating TraceReady as more than an MVP asset.

Use `docs/sales-sprint.md`, `docs/fulfillment-runbook.md`, and `docs/order-ledger-template.csv` to turn real cleanup orders into diligence-ready proof without committing private customer data.

Use `docs/competitive-undercut.md` for the current competitor map and undercut positioning.

Use `docs/stripe-branding-runbook.md` for the external Stripe Dashboard branding record. The current cleanup and pilot Payment Links were visually verified in the rendered Stripe checkout UI on 2026-06-14.

Use `npm run verify:launch -- --strict-dns` after the registrar records are changed to fail fast until `traceready.online` resolves to GitHub Pages.
