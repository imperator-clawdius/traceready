# TraceReady Launch Status

## Live MVP

- Repository: https://github.com/imperator-clawdius/traceready
- Deployment target: GitHub Pages
- Custom domain configured in GitHub Pages: `traceready.online`
- Last verified launch state: 2026-06-11
- Static export output: `out/`
- HTTPS: GitHub Pages certificate approved for `traceready.online` and `www.traceready.online`; HTTPS enforcement enabled.
- Launch feature: browser-side CSV, KML, and GeoJSON validator that creates a downloadable buyer-readiness pack for coffee and cocoa farm files.
- Downloaded pack includes cleaned CSV, issue log, buyer/importer summary, readiness report, normalized GeoJSON, structured EUDR checklist, and paid-cleanup intake note.
- Launch demo coverage: built-in sample runners for CSV, KML, and GeoJSON.
- Public sample proof: `/traceready-sample-output.zip` contains an anonymized cleaned pack.
- Conversion actions: `Buy 24-hour cleanup` CTA and `Buy 5-file pilot` CTA route to `/checkout/cleanup/` and `/checkout/pilot/` before Stripe. `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is configured to a live Stripe Payment Link; the pilot checkout uses `NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK` if configured and otherwise uses the public fallback Payment Link.
- Paid-order handoff: after checkout, customers are prompted to email the source file, commodity, source country, deadline, and buyer brief to `founder@traceready.online`.
- Trust pages: `/privacy/` and `/terms/` explain browser-side validation, paid-cleanup handling, Stripe checkout, retention, deletion, confidentiality, no model training, and the no-legal-certification boundary.
- Legal operator bridge: TraceReady is operated by Passive Print Labs LLC, and the launch surface plus checkout handoff pages warn buyers that Stripe checkout may show Passive Print Labs LLC.
- Live Stripe product: `TraceReady 24-hour cleanup`
- Live Stripe price: `price_1TdyJyEB0YO5IZfZmyF6kC2L`
- Live Stripe payment link: `https://buy.stripe.com/4gMbJ1d4Tate2L531O8IU01`
- Live Stripe pilot payment link: `https://buy.stripe.com/8x24gz0i70SEgBVgSE8IU02` (quantity 5 of the $149 cleanup price, total $745)
- Stripe branding runbook: `docs/stripe-branding-runbook.md` is the remaining Dashboard checklist if the rendered Stripe page does not show TraceReady as the buyer-facing brand.

## Verification Commands

```powershell
npm run lint
npm run test
npm run build
npm run verify:launch
npm run verify:launch -- --strict-dns
gh run list --repo imperator-clawdius/traceready --workflow pages.yml --limit 3
gh api repos/imperator-clawdius/traceready/pages
Resolve-DnsName traceready.online
Resolve-DnsName www.traceready.online
gh variable list --repo imperator-clawdius/traceready
```

`npm run verify:launch` checks the deployed GitHub Pages artifact directly through a GitHub Pages IP with the `traceready.online` host header. It also checks live HTTPS pages when DNS is ready, verifies the `www` HTTPS redirect to the apex domain, and verifies the live Stripe Payment Link. DNS is still reported separately so the app artifact can be validated while registrar records are pending.

## DNS And HTTPS

Current required DNS records:

```text
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   imperator-clawdius.github.io
```

Expected GitHub Pages API state:

```json
{
  "cname": "traceready.online",
  "html_url": "https://traceready.online/",
  "https_certificate": {
    "state": "approved",
    "domains": ["traceready.online", "www.traceready.online"]
  },
  "https_enforced": true
}
```

If GitHub Pages ever serves the site over HTTP but `curl.exe -I https://traceready.online/` fails with a certificate principal/SNI error, re-trigger certificate provisioning by removing and restoring the Pages custom domain, then enable HTTPS enforcement:

```powershell
gh api --method PUT repos/imperator-clawdius/traceready/pages -F cname=null
gh api --method PUT repos/imperator-clawdius/traceready/pages -f cname=traceready.online
gh api repos/imperator-clawdius/traceready/pages
gh api --method PUT repos/imperator-clawdius/traceready/pages -F https_enforced=true
```
