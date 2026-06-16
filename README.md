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
- Free issue-log triage page for prospects who want to share non-sensitive issue counts before sending raw farm coordinates.
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

Use `docs/public-dataset-mini-audit.md` for proof-led outreach based on a reproducible public cocoa dataset audit.

Use `/field-notes/eudr-file-errors/` as the shareable public field note for LinkedIn, association, and reply-thread outreach when a prospect needs the practical issue list before trusting the tool.

Use `docs/proof-led-outreach-sprint.md` for company-level target tiers, message variants, and the 10-day proof-led outreach cadence.

Use `docs/proof-led-outreach-batch-01.csv` as the first 20 company/channel routes to contact. Each row has a `b01-rNN` route ID plus tracked proof, field-note, and file-check URLs. Use `docs/proof-led-outreach-send-pack-01.md` for copy-pasteable first messages and follow-ups. The proof page preserves those UTM route IDs when visitors continue to the browser checker, and generated buyer summaries, ZIP packs, and cleanup handoffs stamp the route ID when present. Run `npm run render:outreach` after editing the CSV, then `npm run verify:outreach` so the committed batch and send packet stay sourced, proof-led, measurable, and free of personal contact data.

Use `docs/proof-led-outreach-results-batch-01.csv` as the prefilled 20-route tracking ledger. Run `npm run audit:outreach-routes -- --tier importer --limit 15` before an importer send block to check which public source routes are currently reachable from the CLI and which need manual inspection. Run `npm run prepare:outreach -- --today 2026-06-16 --send-limit 8 --send-tier importer` to seed an ignored private working copy at `private/outreach-results-batch-01.csv` and render `private/outreach-day-pack.md` from the first unsent importer routes. Keep the `route_id`, `proof_url`, `field_note_url`, and `file_check_url` columns intact. Run `npm run init:outreach-results` after changing the batch CSV, and run `npm run summarize:outreach -- path/to/private-results.csv` to calculate reply, field-note click, file-check, pilot, and paid-order rates without committing private replies. Use `npm run next:outreach -- --results path/to/private-results.csv --send-limit 8 --send-tier importer` to print the next importer send/follow-up queue, then `npm run render:outreach-day -- --results path/to/private-results.csv --send-limit 8 --send-tier importer --today 2026-06-16 --output path/to/day-pack.md` to render the exact first-message and follow-up copy for that block. Use `npm run render:outreach-send-checklist -- --results path/to/private-results.csv --send-limit 3 --send-tier importer --today 2026-06-16 --output path/to/send-checklist.md` as the one-by-one send console. Use `npm run render:outreach-replies -- --results path/to/private-results.csv --route b01-r06 --output path/to/replies-b01-r06.md` before answering objections or file-check replies. Use `npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --status sent --response-type none --date-sent 2026-06-16 --notes "sent via company contact form"` to update a send, or add `--field-note-clicks 1` when a routed field-note visit is visible in analytics.

Run `npm run verify:outreach-email` before treating cold-email non-response as market evidence. It checks TraceReady outreach-domain MX, forwarding SPF, DMARC, and DKIM signals, and fails until the domain is ready enough for authenticated outbound email. DNS still cannot prove the `founder@traceready.online` alias exists, so send and receive a manual test, then rerun with `npm run verify:outreach-email -- --alias-tested` before a batch send.

Use `docs/stripe-branding-runbook.md` for the external Stripe Dashboard branding record. The current cleanup and pilot Payment Links were visually verified in the rendered Stripe checkout UI on 2026-06-14.

Use `npm run verify:launch -- --strict-dns` after the registrar records are changed to fail fast until `traceready.online` resolves to GitHub Pages.
