# TraceReady

Clean and validate messy farm CSV, KML, and GeoJSON files into buyer-ready coffee and cocoa handoff packs for exporters and EU importers.

## MVP

- Browser-side file analysis for CSV, KML, GeoJSON, and JSON GeoJSON.
- Built-in sample runners for CSV, KML, and GeoJSON launch demos.
- Multi-file importer pilot triage for up to 5 supplier files, with a batch readiness summary and copyable pilot brief.
- Farm record normalization for supplier, country, commodity, batch, area, coordinates, and geometry.
- EUDR readiness checks for missing traceability fields, invalid coordinates, duplicate farm IDs, and polygon requirements for plots over 4 hectares.
- Downloadable ZIP pack with cleaned CSV, issue log, buyer summary, readiness report, normalized GeoJSON, structured EUDR checklist, and a paid-cleanup intake note.
- Public anonymized sample output pack at `/traceready-sample-output.zip`.
- Paid cleanup CTA using `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` when configured, plus a checkout-backed 5-file pilot using `NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK` or the public fallback link.
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

`NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is configured in GitHub Actions variables for the live $149 cleanup Payment Link. If that variable is removed, the button opens a prefilled email to `NEXT_PUBLIC_CONTACT_EMAIL`.

The 5-file importer pilot uses `NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK` when configured. The app also includes the public fallback Payment Link created from five $149 cleanup passes: `https://buy.stripe.com/8x24gz0i70SEgBVgSE8IU02`.

After checkout, the launch app prompts customers to email the source file, commodity, source country, deadline, and buyer brief so the paid cleanup order can be fulfilled manually. TraceReady is operated by Passive Print Labs LLC, and Stripe checkout may show Passive Print Labs LLC.

See `docs/launch-status.md` for the current deployment and DNS checklist.

See `docs/product-plan.md` for future commodity presets, expansion options, and pivot paths.

See `docs/investor-readiness.md` for the buyability gates, commercial ladder, and evidence to capture before treating TraceReady as more than an MVP asset.

Use `docs/sales-sprint.md`, `docs/fulfillment-runbook.md`, and `docs/order-ledger-template.csv` to turn real cleanup orders into diligence-ready proof without committing private customer data.

Use `docs/competitive-undercut.md` for the current competitor map and undercut positioning.

Use `npm run verify:launch -- --strict-dns` after the registrar records are changed to fail fast until `traceready.online` resolves to GitHub Pages.
