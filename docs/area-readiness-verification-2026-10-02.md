# Area-dependent readiness verification

A synthetic live point record with every other field populated but no area
received 100/100, no issues, and `polygon_threshold: pass` in its downloaded
checklist. A supplied area of `-1` produced the same result. The existing
four-hectare comparison cannot establish the appropriate geometry threshold
from absent or invalid area. A five-hectare point correctly triggered
`polygon_required`, confirming that the gap concerned unresolved input.

This follow-up starts from main `1658b34b435170ae44d20081071a26217dc2a608`.
The earlier five-file rehearsal records the behavior of that checkpoint; its
historical counts are not rewritten to represent this additional validation.

## Resulting behavior

| Input | Issue / screen result | Exported polygon check | Preserved facts |
| --- | --- | --- | --- |
| Point or other non-polygon with absent area | `unknown_area` warning; Review | `review`, with unknown-area count | Area stays blank |
| Supplied unparseable, non-finite or nonpositive area | `invalid_area` blocker | `blocker_or_review` | Numeric values stay numeric; original invalid text appears in issue evidence |
| Valid polygon with absent area | No area issue needed for this geometry threshold | `pass` | Polygon unchanged; area stays blank |
| Point with exactly 4 hectares | Existing behavior retained | `pass` | Area remains 4 |
| Point with more than 4 hectares | Existing `polygon_required` blocker | `blocker_or_review` | No polygon or area is invented |

Invalid supplied area stays explicit even when a polygon is present. A known
polygon in one record cannot resolve another record's unknown point area.
Warnings continue to use the existing score and summary rules: an otherwise
clean unknown-area point now shows 97/100 and “Ready for review with warnings,”
not an unqualified pass. Records without blockers is not a count of records
without warnings.

## Verification

- Twelve focused regressions exercise CSV, KML and GeoJSON input plus the actual
  ZIP checklist, cleaned CSV, issue log and buyer summary. Before the change,
  nine failed and three valid controls passed.
- `npm run check` passes: 329 tests in 46 files, local verifiers, lint,
  TypeScript and the production static build.
- Chrome against the built candidate downloads six ZIPs covering missing area,
  negative area, invalid text, a known large point, exactly four hectares and a
  valid polygon with unknown area. Exported status and preserved values match
  the table; the screen visibly shows the unresolved warning. File analysis
  makes no network requests.

All records are fictional. This applies the existing threshold truthfully; it
does not add a legal certification claim, estimate area, change offers, send
messages, make a payment, or verify real-world geometry, fulfillment or buyer
acceptance. Merge still requires review and triggers the existing Pages workflow.
