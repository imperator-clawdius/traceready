# TraceReady Product Plan

## Current Wedge

TraceReady is live as a coffee and cocoa EUDR readiness MVP at `https://traceready.online/`.

The launch product is intentionally narrow:

- Browser-side upload for CSV, KML, GeoJSON, and JSON GeoJSON farm files.
- Readiness checks for missing traceability fields, invalid coordinates, duplicate farm IDs, and polygon requirements for plots over 4 hectares.
- Multi-file cleanup check for up to 5 supplier files, including a batch readiness summary and copyable pilot summary.
- Downloadable ZIP pack with cleaned CSV, issue log, buyer/importer summary, readiness report, normalized GeoJSON, structured EUDR checklist, and paid-cleanup intake note.
- Paid cleanup CTA for teams that want TraceReady to fix and return the pack manually.

Positioning: messy supplier traceability file in, buyer-readiness pack out.

TraceReady is not legal certification, a due diligence statement submission system, or a full compliance platform.

## Why This Can Expand Beyond Coffee And Cocoa

The product core is not coffee-specific. The reusable engine validates farm or production-site traceability data, normalizes geolocation, flags operational blockers, and packages buyer-facing evidence.

EUDR-covered commodities include cattle, cocoa, coffee, oil palm, rubber, soya, and wood. Future expansion should use the same engine with commodity-specific templates and examples.

Reference: Regulation (EU) 2023/1115, Article 2 and Annex I.
https://eur-lex.europa.eu/eli/reg/2023/1115/oj/

## Commodity Options

| Option | Customer | Same Core Workflow | Commodity-Specific Changes |
| --- | --- | --- | --- |
| Coffee | Exporters, coops, EU importers | Upload farm file, validate records, download readiness pack | Coffee examples, coffee buyer language, coffee batch/lot wording |
| Cocoa | Coops, processors, chocolate supply chains | Upload farm file, validate records, download readiness pack | Cocoa examples, cocoa supplier/cooperative wording |
| Soya | Soy exporters, feed supply chains, EU buyers | Upload supplier/farm file, validate traceability and geolocation | Soy lot/harvest wording, product examples, feed-chain buyer summary |
| Oil palm | Palm oil mills, smallholder groups, EU buyers | Upload smallholder/plot file, validate geolocation and missing fields | Palm smallholder wording, mill/supplier fields, palm-derived product language |
| Rubber | Rubber producers, processors, tyre supply chains | Upload farm/plot file, validate production location evidence | Rubber/tapper/processor wording, tyre supply-chain summary |
| Cattle | Ranches, beef/leather chains, EU buyers | Upload production-location file, validate supplier and location evidence | Ranch/herd/supplier fields, animal or lot traceability language |
| Wood | Timber, paper, furniture supply chains | Upload harvest/production-location evidence, validate location coverage | Harvest concession/plot fields, timber/product wording, broader geometry requirements |

## Pivot Paths

### 1. Commodity Presets

Add a commodity selector while keeping the current interface. Each preset changes sample files, accepted aliases, checklist text, report wording, and paid-cleanup handoff copy.

Best next presets:

- TraceReady Soy
- TraceReady Palm
- TraceReady Rubber
- TraceReady Cattle
- TraceReady Wood

### 2. Paid Cleanup Bureau

Keep the self-serve checker free or lightweight. Monetize by selling 24-hour cleanup passes where customers send messy files and receive a normalized pack.

Why it fits: many suppliers will not want software. They want the file fixed before a buyer deadline.

The $745 5-file pilot should be used to test repeat behavior before building account management. A buyer can upload several supplier files, compare readiness, copy the pilot summary, buy the pilot checkout, and submit the batch for cleanup.

### 3. Importer Pre-Screen

Position TraceReady for EU importers and traders who receive messy supplier files. The buyer uploads a supplier file before accepting a shipment and gets a simple pass/review/cleanup-needed summary.

### 4. Supplier Readiness Pack Generator

Sell to exporters and cooperatives that need to look ready for EU buyers. Emphasize a clean buyer/importer summary and issue register rather than regulatory claims.

### 5. White-Label Or API Later

If repeated cleanup requests come from one buyer, broker, or importer, package the validator as a lightweight API or white-label intake page. Do not build this before repeat demand exists.

### 6. Non-EUDR Traceability Cleanup

The same upload, normalize, issue-log, and ZIP-pack pattern can support other traceability workflows where buyers need clean supplier evidence. Keep this as a later pivot only; the current launch story should stay EUDR-focused.

## What Stays The Same

- Upload messy source file.
- Normalize supplier, country, commodity, batch/lot, area, and geolocation.
- Flag missing fields, duplicate IDs, invalid coordinates, and geometry issues.
- Generate cleaned CSV, issue log, GeoJSON, readiness report, buyer summary, checklist, and paid-cleanup intake note.
- Keep files browser-side for self-serve MVP.
- Preserve paid cleanup as the conversion path.

## What Changes By Commodity

- Field aliases and required-field labels.
- Sample files and launch demos.
- Report and checklist wording.
- Buyer/importer summary language.
- Paid-cleanup email prompts.
- Commodity-specific issue checks where the data shape differs.
- Public marketing copy and examples.

## Guardrails

- Do not claim legal certification.
- Do not claim EUDR compliance beyond operational readiness.
- Do not broaden the live homepage until at least one non-coffee/cocoa customer segment is validated.
- Do not replace the live paid cleanup flow when adding presets.
- Check current official EUDR commodity/product scope before publishing product-specific compliance claims.
- Treat derived products as a wording and checklist problem first; the source traceability data still needs to connect back to the relevant commodity production location.

## Ship-Or-Die Stage 3 Note

TraceReady already satisfies the small-bet launch shape:

- One usable feature: clean and validate a farm traceability file.
- One public link: `https://traceready.online/`.
- One monetization path: paid 24-hour cleanup.
- One narrow wedge: coffee/cocoa EUDR readiness.

Future work should increase buyer usefulness without hiding the product back in private polish.
