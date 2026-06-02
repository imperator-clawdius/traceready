# TraceReady

Clean and validate messy farm CSV, KML, and GeoJSON files into EUDR-ready coffee and cocoa compliance packs for exporters and EU importers.

## MVP

- Browser-side file analysis for CSV, KML, GeoJSON, and JSON GeoJSON.
- Farm record normalization for supplier, country, commodity, batch, area, coordinates, and geometry.
- EUDR readiness checks for missing traceability fields, invalid coordinates, duplicate farm IDs, and polygon requirements for plots over 4 hectares.
- Downloadable ZIP pack with cleaned CSV, issue log, readiness report, and normalized GeoJSON.
- Paid cleanup CTA using `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` when configured, with email fallback.

## Local

```bash
npm install
npm run lint
npm run build
npm run check
npm run dev
```

## GitHub Pages

The site statically exports to `out/` with `output: "export"` and deploys through `.github/workflows/pages.yml`.

Custom domain: `traceready.online`

## Conversion

`NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is configured in GitHub Actions variables for the live $149 cleanup Payment Link. If that variable is removed, the button opens a prefilled email to `NEXT_PUBLIC_CONTACT_EMAIL`.

After checkout, the launch app prompts customers to email the source file, Stripe receipt email, commodity, source country, and deadline so the paid cleanup order can be fulfilled manually.

See `docs/launch-status.md` for the current deployment and DNS checklist.
