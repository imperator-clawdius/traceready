# TraceReady proof-led outreach sprint

## Goal

Turn the public dataset mini-audit into the first 10 serious file conversations without asking strangers to trust a new SaaS brand.

The base proof page is `https://traceready.online/proof/`. For outreach, send the tracked `proof_url`, `field_note_url`, and `file_check_url` from the batch row so every reply, field-note click, and browser-side check can be tied back to a `b01-rNN` route ID. The supporting write-up is `docs/public-dataset-mini-audit.md`.

The public field note at `https://traceready.online/field-notes/eudr-file-errors/` is the shareable credibility asset for LinkedIn, associations, and reply threads. Use it when the prospect needs a readable explanation of the seven file defects before running a file.

The first executable batch is `docs/proof-led-outreach-batch-01.csv`. The copy-pasteable send packet is `docs/proof-led-outreach-send-pack-01.md`. They are intentionally company-level only: public route URLs, no employee names, no personal emails, no personal profile URLs, deterministic route IDs, tracked TraceReady URLs, and every row starts from the public audit numbers. Run `npm run render:outreach` after editing the CSV, then `npm run verify:outreach` before using or modifying the batch.

If a routed visitor lands on `/proof/`, the "Run a file in the browser" CTA keeps the same UTM route parameters. If they run the free checker from a routed URL, the copied buyer summary, downloaded ZIP artifacts, and paid-cleanup mailto handoff include the non-personal `Outreach route: b01-rNN` attribution line. Use that line to connect real file checks back to the private results ledger.

After sending, copy `docs/proof-led-outreach-results-batch-01.csv` to a private working file, keep the route/link columns intact, update `field_note_click_count` from analytics when available, and run `npm run summarize:outreach -- path/to/private-results.csv`. Do not commit private replies, personal contact details, customer files, or order evidence.

## Private Results Updates

Do not edit the committed public initialized ledger after real outreach starts. Copy it to a private file first, then update one `route_id` at a time:

```bash
npm run audit:outreach-routes -- --tier importer --limit 15
npm run prepare:outreach -- --today 2026-06-16 --send-limit 8 --send-tier importer
npm run next:outreach -- --results path/to/private-results.csv --send-limit 8 --send-tier importer --follow-up-after-days 4
npm run render:outreach-day -- --results path/to/private-results.csv --send-limit 8 --send-tier importer --follow-up-after-days 4 --today 2026-06-16 --output path/to/day-pack.md
npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --date-sent 2026-06-16 --status sent --response-type none --notes "sent via company contact form" --next-action "follow up in 4 business days"
npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --field-note-clicks 1 --notes "routed field-note visit seen in analytics" --next-action "watch for file check or reply"
npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --status file_checked --response-type file_check --file-checks 1 --notes "route-stamped buyer summary received" --next-action "ask whether they want the cleaned pack"
npm run update:outreach-result -- --results path/to/private-results.csv --route b01-r06 --status paid_order --response-type paid_order --file-checks 1 --paid-orders 1 --notes "paid cleanup ordered" --next-action "fulfill 24-hour cleanup"
```

`audit:outreach-routes` probes the public source URLs in the committed batch so stale or bot-blocked routes do not get mistaken for a product problem. `prepare:outreach` creates `private/outreach-results-batch-01.csv` if it does not already exist, reuses it if it does, and renders `private/outreach-day-pack.md` for the current block. Use `--send-tier importer` when the block is meant to create direct buyer traction before association education. `next:outreach` prints the next unsent routes, follow-ups due by date, and active file-check/reply opportunities. `render:outreach-day` joins that queue back to the committed batch copy and writes only the first messages, due follow-ups, active opportunities, and private-safe update commands needed for the current send block. The updater refuses `docs/proof-led-outreach-results-batch-01.csv` by default and re-runs the private-safe result validation before writing.

## Positioning

Do not lead with "buy my tool." Lead with proof:

> I ran a public cocoa farm-location dataset through TraceReady. It had 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity. If you have one supplier CSV, KML, or GeoJSON file, I can run the same readiness check and send back the exact rows that need cleanup.

The founder angle is useful only after the proof lands: small team, hands-on cleanup, browser-side first pass, no procurement cycle.

## Contact Rules

- Use company-level routes only: public contact forms, general sales inboxes, association inquiry forms, public company LinkedIn pages, and event/community channels.
- Do not scrape employee emails, personal phone numbers, or private social profiles.
- Do not imply certification, legal due diligence, TRACES submission, or deforestation-free proof.
- Do not ask for confidential coordinates in the first message. Ask them to run the browser-side check first, then offer concierge cleanup if useful.
- If they hesitate on file sharing, send `/file-triage/` and ask for non-sensitive issue counts, field names, commodity, source country, buyer deadline, and a sample row shape instead of raw farm coordinates.
- Log sends, field-note clicks, replies, file checks, route-stamped buyer summaries, and orders against the row's `route_id` in a private copy of `docs/proof-led-outreach-results-batch-01.csv`; do not commit customer files or private replies.

## Target Tiers

### Tier 1: Association and Community Channels

These are not direct buyers, but they can validate the pain and point smaller members toward the free proof page.

| Priority | Channel | Why it fits | Public route | Source |
| --- | --- | --- | --- | --- |
| 1 | European Coffee Federation | Represents the European coffee sector and publishes EUDR-related industry material. | Website/contact route or public LinkedIn company page. | https://www.ecf-coffee.org/ |
| 2 | EUDR Coffee / German Coffee Association | Public EUDR coffee tooling and member education channel. | Website/contact route or public association channels. | https://eudr-coffee.eu/ |
| 3 | Deutscher Kaffeeverband | German coffee association with EUDR tools and guidance for members. | Website/contact route. | https://www.kaffeeverband.de/en |
| 4 | Specialty Coffee Association | Published sector education on EUDR coffee supply-chain challenges. | Article comments, event/community route, or public LinkedIn company page. | https://sca.coffee/sca-news/25/issue-22/cracking-coffee-regulation |

### Tier 2: Green Coffee Importers and Buyers

Start here for direct commercial traction. The best-fit buyer is a small or mid-sized specialty importer that already handles supplier files but does not want an enterprise compliance platform.

| Priority | Company | Why it fits | Public route | Source |
| --- | --- | --- | --- | --- |
| 1 | Cafe Imports Europe | Specialty green coffee importer with Berlin office and public Europe sales route. | Public Europe contact page. | https://www.cafeimports.com/europe/blog/general-contact/ |
| 2 | Sucafina Specialty Europe | Green coffee network serving roasters across Europe, Middle East, and Africa. | Public EMEA contact route. | https://sucafina.com/emea |
| 3 | Falcon Coffees Europe | Specialty green coffee trader with a dedicated EU service and Berlin office. | Public Falcon Europe/contact route. | https://falconcoffees.com/falcon-europe/ |
| 4 | Nordic Approach | Specialty green coffee importer serving roasters and buyers from Belgium warehouse stock and direct shipments. | Public website/contact route. | https://www.nordicapproach.no/ |
| 5 | Trabocca | Specialty coffee importer emphasizing traceable coffees and end-to-end supply chains. | Public contact form or company inbox. | https://www.trabocca.com/about-us/ |
| 6 | InterAmerican Coffee Europe | Specialty green coffee importer based in Europe, part of Neumann Kaffee Gruppe. | Public website/contact route. | https://interamericancoffee.de/ |
| 7 | EFICO | Belgian green coffee specialist connecting farmers and roasters. | Public website/contact route. | https://efico.com/ |
| 8 | Daarnhouwer & Co | Dutch trader/importer active in coffee and cocoa, useful because TraceReady covers both. | Public coffee trading route. | https://daarnhouwer.com/coffee/ |
| 9 | Ally Coffee Europe | Green coffee company with European specialty contact route. | Public contact page. | https://www.allycoffee.com/contact-us/ |
| 10 | Covoya Specialty Coffee Europe | Wholesale green coffee importer with public Europe office contact information. | Public contact page. | https://www.covoyacoffee.com/contact |
| 11 | Belco | Sources, imports, and distributes green coffee in France and Europe. | Public company route. | https://salpa.fr/en/the-group/belco/ |
| 12 | List + Beisler | Hamburg green coffee importer focused on specialty roasters. | Public website/contact route. | https://www.list-beisler.coffee/en/ |

### Tier 3: Overflow Partners

These can refer messy-file work even when they are not the end buyer.

| Partner Type | Why it fits | Message angle |
| --- | --- | --- |
| EUDR consultants | They may not want to clean malformed CSV/KML/GeoJSON files by hand. | "I can be the first-pass file cleanup desk before your due diligence work." |
| Certification and audit firms | They see broken supplier evidence before review. | "I do not certify; I normalize files and produce row-level issue logs." |
| Coffee/cocoa trade educators | They need practical examples for members. | "Can I share a public mini-audit showing common file defects?" |
| Roaster associations | Smaller roasters may get importer requests they do not understand. | "This is a free first check for supplier files, not a platform migration." |

## Message Variants

### Association or Community Channel

Subject: Free EUDR file-readiness example for coffee members

Hi {{organization}},

I built TraceReady as a narrow cleanup desk for coffee and cocoa CSV/KML/GeoJSON files before buyer review.

I just published a public mini-audit using a 57,658-row cocoa farm-location dataset. The useful part for members is practical: even with latitude, longitude, and area fields, the file still surfaced 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.

Public proof page: {{proof_url}}

This is not legal certification and not a TRACES submission tool. It is a free operational example of the file defects that create buyer-review rework. Is there a member education channel where this would be useful?

### Importer or Green Coffee Buyer

Subject: Row-level check for messy EUDR farm files

Hi {{company}},

Quick, specific note. I ran a public cocoa farm-location dataset through TraceReady, a file-readiness checker for coffee and cocoa handoff files. Even after assuming the file was Colombian cocoa, it still had 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.

That is the narrow problem I am looking for: not "buy software," just "will this supplier CSV/KML/GeoJSON create buyer-review rework?"

Public proof page: {{proof_url}}

You can run one file in the browser first, before sending me anything: {{file_check_url}}

If the issue list is useful, I can turn one file into a cleaned pack and row-level issue log. Worth testing one messy supplier file?

### Consultant or Overflow Partner

Subject: First-pass cleanup desk for EUDR supplier files

Hi {{company}},

I am looking for EUDR consultants and advisors who run into broken coffee/cocoa supplier files before the real due diligence work can even start.

TraceReady is deliberately narrow: CSV/KML/GeoJSON readiness checks, row-level issue logs, cleaned CSV, normalized GeoJSON, and a buyer summary. It does not certify compliance, submit to TRACES, or replace legal review.

Public proof page: {{proof_url}}

If a client sends you a malformed farm file, I can handle the first-pass cleanup so your team is not stuck fixing coordinates, missing plot IDs, duplicate farm IDs, and point-only over-4ha records by hand.

## 10-Day Operating Cadence

For 10 business days:

- Use `docs/proof-led-outreach-batch-01.csv` as day one's first 20 public routes.
- Contact 8 importer/buyer targets per day.
- Contact 4 consultant or overflow targets per day.
- Contact 2 association/community channels per day.
- Post one public proof-led note per day on a relevant professional channel.
- Ask for one of three outcomes only: run the browser-side check, send a non-sensitive sample structure, or refer the person who owns supplier-file cleanup.
- Log every send, field-note click, reply, objection, file run, and paid cleanup opportunity by `route_id`.
- Audit public route health before each importer send block with `npm run audit:outreach-routes -- --tier importer --limit 15`.
- Generate the next direct-buyer route queue before each importer send block with `npm run next:outreach -- --results path/to/private-results.csv --send-limit 8 --send-tier importer`.
- Render the exact importer send-block copy with `npm run render:outreach-day -- --results path/to/private-results.csv --send-limit 8 --send-tier importer --output path/to/day-pack.md`.
- Summarize the private results ledger daily with `npm run summarize:outreach -- path/to/private-results.csv`.

Do not count likes, compliments, or "interesting" replies as traction. Count real files, paid cleanup orders, pilot requests, referrals to data/compliance owners, and permissioned de-identified before/after evidence.

## Qualification and Disqualification

Qualify when:

- They work with coffee or cocoa files connected to EU buyer/importer review.
- They receive CSV, KML, GeoJSON, Excel, or mixed supplier packs.
- The immediate pain is malformed farm/plot data, missing IDs, bad coordinates, duplicate records, or unclear geometry.
- They want a quick readiness check or cleaned buyer pack before a formal compliance workflow.

Disqualify when:

- They want legal certification, DDS filing, TRACES submission, deforestation-free proof, or satellite-risk scoring.
- They only want a long enterprise platform evaluation.
- They cannot share even a sanitized file structure and will not run the browser-side check.
- They are outside coffee/cocoa and have no near-term EU buyer pressure.

## Objection Handling

| Objection | Response |
| --- | --- |
| "Who are you?" | "A software operator running a narrow cleanup desk. I am not asking you to trust credentials; start with the public proof page or run one file browser-side." |
| "We already use an EUDR platform." | "That is fine. TraceReady sits before the platform when supplier files are malformed and need row-level cleanup." |
| "We cannot send coordinates." | "Run the file in your browser first. Coordinates do not need to leave your machine for the initial issue list." |
| "Can you certify this?" | "No. TraceReady is operational cleanup and readiness checking, not legal certification or due diligence." |
| "We only have Excel." | "Send or export the relevant sheet structure. The paid cleanup workflow can normalize common spreadsheet exports, but the browser MVP currently checks CSV/KML/GeoJSON/JSON GeoJSON." |

## Success Criteria

The sprint succeeds if it produces any of these:

- 10 paid single-file cleanup orders.
- 1 paid 5-file pilot.
- 5 real browser-side file checks from target companies.
- 3 consultant or association referrals to actual file owners.
- 1 permissioned de-identified before/after case study.

If none of those happen after 10 business days, stop polishing the product. Change the segment, offer, or channel.
