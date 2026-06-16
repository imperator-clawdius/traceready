# TraceReady 10-Order Sales Sprint

## Goal

Get the first 10 paid cleanup orders or one paid 5-file pilot. Do not optimize the product again until this sprint has real evidence.

## Ideal Customers

- EU coffee and cocoa importers receiving farm files from suppliers.
- Coffee exporters and cooperatives preparing buyer packs.
- Cocoa processors and compliance consultants cleaning supplier data for clients.
- Small teams that are not ready for enterprise EUDR platforms but still need files fixed.

## Offer

Use two offers only:

- `$149` single-file cleanup: one messy source file or one clearly related shipment pack.
- `$745` 5-file pilot: up to five supplier files checked together, with cleaned packs and a batch pilot summary.

## Qualification Questions

Ask these before selling:

- Are you working with coffee or cocoa files for an EU buyer/importer?
- What format do you have: CSV, KML, GeoJSON, Excel, or something else?
- How many farm or plot records are in the file?
- What is the deadline?
- Has a buyer, importer, or platform rejected the file yet?
- Do you need cleanup, a buyer summary, or just a quick readiness check?

If they are not ready to send raw coordinates, route them to `/file-triage/` first. Ask for issue counts, field names, commodity, source country, buyer deadline, and a non-sensitive sample row shape. Count a useful triage email as a real file conversation only if it includes concrete issue counts or buyer requirements.

## Outreach Message

Proof-led variant: use `docs/public-dataset-mini-audit.md` when the prospect has not shown trust yet. Lead with the public-dataset defect numbers before asking for a file.

Use `docs/proof-led-outreach-sprint.md` for the company-level target tiers, public contact-route rules, association/importer/consultant message variants, and 10-day operating cadence.

Start with `docs/proof-led-outreach-batch-01.csv` for the first 20 public buyer/importer routes and `docs/proof-led-outreach-send-pack-01.md` for copy-pasteable first messages and follow-ups. Use the row-specific `proof_url` and `file_check_url` links in the send packet, not the generic homepage link, so every response can be tied back to a `route_id`. Run `npm run render:outreach` after editing the CSV, then `npm run verify:outreach` before sending from that batch.

If importer route sendability blocks direct buyer traction, switch to `docs/proof-led-outreach-batch-02.csv` and `docs/proof-led-outreach-send-pack-02.md`. Batch 02 targets EUDR consultants, certification bodies, traceability platforms, and geospatial providers with an overflow-cleanup offer for malformed CSV/KML/GeoJSON files before formal review or platform intake.

After sending, copy `docs/proof-led-outreach-results-batch-01.csv` to a private file and run `npm run audit:outreach-routes -- --tier importer --limit 15 --json-output private/outreach-route-audit-importer.json` so stale or blocked public routes do not get counted as product traction failure. Keep browser route-fit findings in `private/outreach-sendability-audit-importer.json` and run `npm run verify:outreach-sendability` before using them. Run `npm run next:outreach -- --results path/to/private-results.csv --send-limit 8 --send-tier importer` before direct-buyer send blocks. Run `npm run render:outreach-day -- --results path/to/private-results.csv --send-limit 8 --send-tier importer --today 2026-06-16 --output path/to/day-pack.md` to generate the exact first-message and follow-up copy for that block. Run `npm run render:outreach-send-checklist -- --results path/to/private-results.csv --send-limit 3 --send-tier importer --today 2026-06-16 --route-audit private/outreach-route-audit-importer.json --sendability-audit private/outreach-sendability-audit-importer.json --output path/to/send-checklist.md` to work sends one route at a time. For any queued `browser_form_ready` route, run `npm run render:outreach-send-ready -- --results path/to/private-results.csv --sendability-audit private/outreach-sendability-audit-importer.json --route b01-rNN --today 2026-06-16 --output private/send-ready-b01-rNN.md` before typing into a third-party form; the private packet carries exact field mapping, reply-risk notes, post-send logging, and the action-time confirmation text. Run `npm run render:outreach-replies -- --results path/to/private-results.csv --route b01-r06 --output path/to/replies-b01-r06.md` before answering objections or file-check replies. Run `npm run summarize:outreach -- path/to/private-results.csv` to measure reply rate, file-check rate, pilot requests, and paid cleanup orders by route. Use `npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --status sent --response-type none --date-sent 2026-06-16` to update one private row after a send or reply. When a routed prospect copies a buyer summary, downloads a ZIP, or opens the paid-cleanup handoff, TraceReady stamps `Outreach route: b01-rNN` into the generated text so the result can be logged without storing personal contact data.

Subject: Quick cleanup for EUDR farm files

Hi {{name}},

I built TraceReady for coffee and cocoa teams that receive messy farm CSV, KML, or GeoJSON files before EU buyer review.

It checks missing farm IDs, duplicate plots, bad coordinates, point-only over-4ha records, and broken geolocation structure. You can run a file in the browser, download the buyer pack, or buy a 24-hour cleanup pass if the file needs fixing.

Live link: https://traceready.online/

If you have one messy supplier file, I can turn it around as a cleaned buyer pack for $149. If you have several supplier files, the 5-file pilot is $745.

Worth checking one file this week?

## Follow-Up

Subject: Re: EUDR farm file cleanup

Quick follow-up. The narrow use case is simple: if a buyer or importer is about to reject a farm file because the CSV/KML/GeoJSON is messy, TraceReady gives you a cleaned pack and an issue log instead of another spreadsheet back-and-forth.

I am looking for the first 10 paid cleanup orders and can prioritize coffee/cocoa files with real buyer deadlines.

## Daily Sprint Cadence

For 10 business days:

- Contact 20 targeted company or channel routes per day.
- Send every prospect the live link.
- Ask for one real file or one referral to the compliance/data person.
- Log every reply, objection, and order.
- Do not count compliments as traction. Count paid orders, pilot requests, and real files reviewed.

## Success Criteria

The sprint succeeds if TraceReady gets any of these:

- 10 paid single-file cleanup orders.
- 1 paid 5-file pilot.
- 3 repeat users or referrals from one customer.
- A permissioned de-identified before/after case study.

If none of those happen, the next decision is not more UI polish. Change the segment, the offer, or the channel.
