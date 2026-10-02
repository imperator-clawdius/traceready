# Synthetic five-file fulfillment rehearsal

The October 2 rehearsal used fictional records only. It exercised browser-local
analysis, the copied pilot summary, and actual downloaded ZIPs; it did not place
an order, send a message, use customer files, or verify buyer acceptance.

The live root HTML and all ten referenced JavaScript/CSS files matched the Pages
artifact from run `37050890027` byte-for-byte, tying the observed baseline to
main `01fdfb70a3fdb5323614ad0a6a6229b1faf08eec`.

## Reproduced defect and repair

Selecting a five-file batch with two different files named `supplier.csv`, then
replacing it with five uniquely named files, left an obsolete `supplier.csv` row
visible. The list showed six rows although its metrics and copied summary
correctly described five. Filename-only React keys caused the stale row.

Batch rows now use their position plus filename as the key. A mounted-component
regression drives both selections and asserts the exact visible filenames. It
failed before the change with the same extra row seen in the live browser.
Parsing, issue calculations, ZIP generation and commercial copy are unchanged.

The repaired candidate passes `npm run check`: local verifiers, lint, all 317
tests in 45 files, TypeScript and the static production build. Chrome against
that build repeats the same batch and ZIP checks and shows exactly the five new
rows after replacement. File analysis makes no network requests. The original
live baseline remains unchanged until the reviewed repair is merged and deployed.

## Known inputs and reconciled output

| Input | Records | Records without blockers | Blockers | Warnings | Deliberate conditions |
| --- | ---: | ---: | ---: | ---: | --- |
| First `supplier.csv` | 3 | 0 | 3 | 0 | Two duplicate IDs; one out-of-range coordinate pair |
| Second `supplier.csv` | 2 | 2 | 0 | 1 | Unknown area and missing batch remain blank; a four-hectare point |
| `shapes.geojson` | 2 | 1 | 1 | 0 | Six-hectare polygon with a hole; five-hectare point |
| `plots.kml` | 2 | 2 | 0 | 0 | Polygon and small point |
| `unknowns.json` | 1 | 0 | 4 | 2 | Missing identity, country and location; unrecognized commodity and absent batch |
| **Total** | **10** | **5** | **8** | **3** | No missing facts supplied by the tool |

The copied batch summary matched these independent counts. The rehearsal opened
the first-file batch ZIP and five individually exported ZIPs. Each contained all
seven expected artifacts. Cleaned CSV row order and IDs, issue codes/counts,
checklist summaries, buyer-summary counts and geolocation counts matched the
known inputs. The GeoJSON polygon and its hole remained structurally identical.
Unknown values stayed blank; the unrecognized commodity text was retained.

The geolocation layer omits records with no geometry; their rows remain in the
cleaned CSV and their missing-location issues remain in the issue log. Invalid
input geometry/coordinates are retained with issues for review, not certified or
silently fabricated into valid locations.

## Operator limits

The batch view intentionally downloads only its first analyzed file, as the UI
states. Export each supplier file separately for a multi-file handoff. Different
files with the same name currently suggest the same ZIP filename; preserve them
in separate folders or choose distinct output filenames. The rehearsal saved
each under an indexed filename and verified different contents, rather than
assuming that a filename alone identifies the source. It does not prove every
browser or operator save choice prevents overwriting.

This proves deterministic file handling for these inputs. It does not verify
payment, current inbox receipt, manual cleanup decisions, turnaround time,
customer delivery, buyer acceptance, or legal compliance. Follow the existing
fulfillment runbook and retain unresolved supplier questions.
