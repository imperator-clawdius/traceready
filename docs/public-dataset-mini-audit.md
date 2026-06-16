# TraceReady public dataset mini-audit

Generated: 2026-06-16T10:58:05.523Z

## Source

- Dataset: [Colombian-Cocoa-Dataset](https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset)
- License reported by Kaggle API: CC BY-NC-SA 4.0
- Rows downloaded: 57,658
- Rows analyzed by TraceReady: 57,658

This is not a customer file, transaction proof, legal certification, or a due diligence statement. It is a public-dataset stress test showing what happens when a geolocation-heavy cocoa dataset is treated like a buyer handoff file.

## Method

TraceReady used the public row-level `area_ha`, `Latitude`, and `Longitude` columns. The audit supplied `country=Colombia` and `commodity=cocoa` from the dataset metadata so the result focuses on file-readiness gaps rather than penalizing the source for metadata that can reasonably live outside a CSV.

It did not fabricate farm IDs, supplier names, batch IDs, or polygon geometries.

Rule reference: [CBI EUDR coffee guidance](https://www.cbi.eu/market-information/coffee/tips-become-eudr-compliant) states that polygon mapping is mandatory for coffee plots larger than 4 hectares. TraceReady applies the same launch-readiness threshold to coffee and cocoa file checks.

## Result

TraceReady checked 57,658 public cocoa rows: 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.

| Check | Count |
| --- | ---: |
| Records analyzed | 57,658 |
| Records with latitude/longitude | 57,658 |
| Records over 4 hectares | 46,134 |
| Polygon records present | 0 |
| Point-only plots over 4 hectares | 46,134 |
| Blockers found | 161,450 |
| Warnings found | 57,658 |
| Ready records | 0 |
| Readiness score | 0/100 |

## Issue Codes

| TraceReady issue | Count |
| --- | ---: |
| `missing_farmId` | 57,658 |
| `missing_supplier` | 57,658 |
| `missing_batch` | 57,658 |
| `polygon_required` | 46,134 |

## What This Proves

A dataset can have farm coordinates and still be unusable as a buyer-ready EUDR handoff. The obvious failure mode is not fancy satellite risk scoring. It is dirty input structure: missing plot IDs, missing supplier identity, missing shipment linkage, and point-only plots over 4 hectares where polygon geometry is needed.

That is the TraceReady wedge: inspect the file before the buyer, importer, consultant, or enterprise EUDR platform has to reject it.

## Outreach Angle

I ran a public cocoa farm-location dataset through TraceReady. Even after giving it the benefit of the doubt on country and commodity, the file still had 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity. If you have one supplier CSV, KML, or GeoJSON file, I can run the same check and send back the exact rows that need cleanup before buyer review.

## Cold DM

Hi [Name] - quick, specific note. I am a software operator, not an EUDR consultant, so I am not going to pitch a compliance platform.

I ran a public cocoa farm-location dataset through a file-readiness checker I built. Even after assuming the file was Colombian cocoa, it still had 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.

That is the narrow problem I am looking for: not "buy software," just "is this supplier file going to create buyer-review rework?"

You can run one CSV, KML, or GeoJSON file in the browser first, before sending me anything. If the issue list is useful and you want concierge cleanup, I can turn one file into a cleaned pack and row-level issue log.

Worth testing one messy supplier file?

## Build-in-public Post Draft

I analyzed 57,658 public cocoa farm-location rows because I wanted to test a blunt assumption:

A file can have coordinates and still fail as a buyer-ready EUDR handoff.

The public dataset had latitude, longitude, and area values. That sounds geospatially useful. But when I treated it like a coffee/cocoa buyer handoff file, the operational gaps were immediate:

- 46,134 point-only plots over 4 hectares
- 57,658 rows without plot IDs
- 57,658 rows without supplier identity
- 57,658 rows without shipment or lot linkage

This is why I am building TraceReady as a cleanup desk, not another enterprise compliance platform. Small importers, exporters, and specialty teams do not always need a new system first. Sometimes they need the current supplier CSV/KML/GeoJSON file to stop being broken.

TraceReady's job is narrow: show the row-level issues, keep the first check browser-side, and create a cleaned buyer pack when the file needs hands-on cleanup.

Not legal certification. Not a TRACES submission. Just operational file readiness before buyer review.

## Guardrail

TraceReady is operational file cleanup and readiness checking, not legal certification. It does not certify EUDR compliance, submit to TRACES, perform legal due diligence, or prove deforestation-free status.
