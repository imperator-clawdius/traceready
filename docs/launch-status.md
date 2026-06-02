# TraceReady Launch Status

## Live MVP

- Repository: https://github.com/imperator-clawdius/traceready
- Deployment target: GitHub Pages
- Custom domain configured in GitHub Pages: `traceready.online`
- Static export output: `out/`
- Launch feature: browser-side CSV, KML, and GeoJSON validator that creates a downloadable EUDR readiness pack for coffee and cocoa farm files.
- Conversion action: `Buy 24-hour cleanup` CTA. Uses `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` when configured, otherwise falls back to `mailto:founder@traceready.online`.

## Verification Commands

```powershell
npm run lint
npm run build
gh run list --repo imperator-clawdius/traceready --workflow pages.yml --limit 3
gh api repos/imperator-clawdius/traceready/pages
Resolve-DnsName traceready.online
Resolve-DnsName www.traceready.online
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
