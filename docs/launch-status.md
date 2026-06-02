# TraceReady Launch Status

## Live MVP

- Repository: https://github.com/imperator-clawdius/traceready
- Deployment target: GitHub Pages
- Custom domain configured in GitHub Pages: `traceready.online`
- Static export output: `out/`
- Launch feature: browser-side CSV, KML, and GeoJSON validator that creates a downloadable EUDR readiness pack for coffee and cocoa farm files.
- Downloaded pack includes cleaned CSV, issue log, readiness report, normalized GeoJSON, and paid-cleanup intake note.
- Launch demo coverage: built-in sample runners for CSV, KML, and GeoJSON.
- Conversion action: `Buy 24-hour cleanup` CTA. `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is configured to a live Stripe Payment Link; email fallback remains available in code if the variable is removed.
- Paid-order handoff: after checkout, customers are prompted to email the source file, Stripe receipt email, commodity, source country, and deadline to `founder@traceready.online`.
- Live Stripe product: `TraceReady 24-hour cleanup`
- Live Stripe price: `price_1TdyJyEB0YO5IZfZmyF6kC2L`
- Live Stripe payment link: `https://buy.stripe.com/4gMbJ1d4Tate2L531O8IU01`

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

## DNS Required For Claimed Domain

Namecheap is still serving URL forwarding/parking until these records are changed:

```text
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   imperator-clawdius.github.io
```

Remove the Namecheap URL forward and parking records:

```text
A/CNAME/URL forward @   192.64.119.43
CNAME www              parkingpage.namecheap.com
```

After DNS resolves to GitHub Pages, enable HTTPS enforcement:

```powershell
gh api --method PUT repos/imperator-clawdius/traceready/pages -F https_enforced=true
```
