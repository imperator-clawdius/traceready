# TraceReady Fulfillment Runbook

## Purpose

Use this runbook to turn paid orders into repeatable evidence. A buyer will care less about the code and more about whether TraceReady can reliably receive messy files, identify blockers, return cleaned packs, and document the result.

## Order Intake

For every order, capture these fields in `docs/order-ledger-template.csv` or a private copy of it:

- Order date and source.
- Company and contact role.
- Commodity and source country.
- File count and format.
- Records checked, blockers, warnings, and readiness score.
- Offer purchased: `$149 cleanup` or `$745 5-file pilot`.
- Payment status and Stripe receipt email.
- Turnaround time in hours.
- Buyer result: accepted, rejected, more data requested, or unknown.
- Whether this is a repeat customer.

Do not commit private customer names, source files, farm data, or Stripe receipt emails to the public repo.
Treat paid cleanup files as confidential order material. Keep them only as long as needed for fulfillment, support, and payment/accounting records. Delete them on request after delivery unless retention is legally required.

## Fulfillment Steps

1. Confirm payment in Stripe before starting manual cleanup.
2. Save the original source files outside the public repo.
3. Run the files through TraceReady and export the pack.
4. Read the issue log before editing anything.
5. Fix only operational data problems the customer can authorize: field names, missing batch references supplied by the customer, duplicate IDs, coordinate formatting, and buyer-specific naming.
6. Do not invent farm locations, supplier identity, polygons, or legal conclusions.
7. Return the cleaned pack, issue log, buyer summary, and a short plain-English summary.
8. Ask whether the buyer/importer accepted the pack or requested more data.
9. Offer deletion of source files after delivery.
10. Update the order ledger.

## Cleanup Boundaries

TraceReady can:

- Normalize CSV, KML, GeoJSON, and JSON GeoJSON structure.
- Flag bad coordinates, missing fields, duplicate IDs, point-only over-4ha records, and unknown commodities.
- Package an operational buyer handoff.

TraceReady must not:

- Claim legal certification.
- Submit due diligence statements.
- Invent missing farm data.
- Guarantee buyer acceptance.
- Publish customer proof without permission.
- Use paid cleanup files to train AI or machine-learning models.

## Turnaround Targets

- Single-file cleanup: return within 24 hours after payment and usable file receipt.
- 5-file pilot: return an initial cleanup summary within 24 hours and cleaned files within the agreed deadline.

If a file is unusable or outside launch scope, send a clarification request or refund before doing unpaid custom work.

## Proof To Collect

For permissioned de-identified case studies, collect:

- Before: file count, record count, issue count, and issue types.
- After: cleaned pack contents, remaining supplier follow-ups, turnaround time, and buyer result.
- Quote or approval from the customer before using any public proof.
