# TraceReady product verification — 2026-10-02

Baseline: `1e5df23`; review branch: `codex/verify-traceready-delivery`.

## Confirmed defects and repairs

- The validator could mark invalid interior vertices, unclosed holes and invalid
  later MultiPolygon members ready because it used a representative average and
  checked only a Polygon's exterior endpoints. Validate every ring and position,
  including finite ordinates, coordinate ranges, closure and distinct vertices.
- KML imports discarded holes and all but the first polygon; namespace-prefixed
  documents were not recognized. Preserve polygon collections and holes, resolve
  XML local names and preserve optional altitude. Unsupported mixed collections
  now produce an explicit parsing blocker rather than a partial export.
- Malformed KML positions and GeoJSON collection entries were silently omitted.
  They now report a parsing blocker. Original files are never modified.
- Empty or failed input could export passing supplier/geolocation checks. The
  checklist now requires analyzed records and respects parsing/geometry blockers.
- Untrusted CSV text could become a spreadsheet formula. Export adds an apostrophe
  to formula-leading text; numeric coordinates retain their numeric representation.
- Added branch/PR checks so these regressions run before a Pages deployment.
- Updated Next.js and its ESLint config to 16.3.8 and refreshed compatible
  dependencies. The original production dependency audit reported five affected
  packages; the final full audit reports zero findings.

Geometry structure follows [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6)
and [KML polygon boundaries](https://developers.google.com/kml/documentation/kmlreference#polygon).
This is structural validation, not a full topology engine: self-intersections,
hole containment, overlapping polygons and surveyed area accuracy still require
review. Invalid GeoJSON geometry remains in the diagnostic pack alongside its
blockers; downloading a pack is not acceptance or certification.

## Verification

- Initial regression cases: 11 failures / 15 cases against the original implementation.
- Final `npm run check`: 274 tests / 42 files pass; lint, TypeScript and static
  production build pass. Includes 21 new geometry/export regression cases.
- Live launch verifier passes HTTPS pages, apex/www DNS and redirect checks.
  Both Stripe URLs returned HTTP 200; that is not evidence of completed payment.
- Chromium against the static production export: sample upload/download produces
  all seven ZIP artifacts, a real malformed geometry upload displays its blocker,
  the checkout remains scope-request only, and the 390px page has no horizontal
  overflow. No browser runtime errors. Reproducible local harness retained at
  `../portfolio-review/tools/traceready-browser-smoke.cjs`.

## Revenue work remaining

### Checkout repair in this release

- Rendered Stripe inspection on October 2 confirmed the $149 cleanup title and
  price with an available payment form. The pilot instead says its link is no
  longer active. Neither observation required submitting a payment.
- Added a dated per-offer operational record. Cleanup can be enabled independently;
  the inactive pilot remains scope-request only. URL, title and price matching
  prevent an offer from borrowing another offer's checkout availability.
- A required confirmation checkbox reveals the Stripe link only after the customer
  confirms that their file scope and intake instructions were agreed by email.
- Removed market-signal requirements from operational checkout activation. Zero
  sales remains zero; no customer proof is fabricated to enable the first order.
- The Pages workflow now passes the explicit checkout build flag. Branch/PR CI
  covers both enabled and locked builds. The sale verifier checks rendered output
  and dated provider evidence rather than matching source text; it correctly
  reports cleanup available and pilot pending. Launch checks enforce the intended
  per-offer public state and explicitly distinguish HTTP reachability from activation.
- Current email DNS checks pass and the existing June received-message evidence
  validates against its challenge. This is historical delivery plus current DNS,
  not a newly sent inbox or fulfillment test.
- Full enabled-build check: 314 tests in45files, lint, TypeScript and production
  export pass. Chrome verification confirms checkbox reveal/revocation and the
  pilot's email-only fallback. Provider transactions and fulfillment remain untested.

The prior mismatch below is the baseline observation, resolved in code by this
release. Deployment and live verification are recorded separately in the portfolio
ledger. Repairing the inactive pilot requires authenticated Stripe Dashboard
access; it was signed out in this session. Both offers must work before overall
sale readiness passes.

### Baseline observation

The current public checkout is scope-request only. `PAID_ORDER_INTAKE_READY`
defaults false, the Pages workflow does not pass the corresponding variable,
and the button leading to Stripe is absent. The sale-readiness script reports
checkout readiness by matching source text rather than exercising this public
path. Its current output must not be treated as sale-readiness evidence.

Local email readiness verification found existing reply-capture evidence and
passing DNS/auth checks. No new email, outreach, payment or customer file was
sent during this review. The local traction ledger reports zero market signals;
it is not an account-wide revenue audit.

Next: reconcile checkout, delivery readiness and market-validation status; verify
the actual scoped purchase/fulfillment route; review CSV numeric parsing and
malformed-row handling, upload size/concurrency, then release and verify the
deployed artifact. The whole repository review remains incomplete.
