import { describe, expect, it } from "vitest";
import {
  parseOutreachSendChecklistArgs,
  renderOutreachSendChecklist,
} from "./render-outreach-send-checklist.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents the European coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r06,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
3,b01-r07,importer,Sucafina Specialty Europe,green coffee network,Public EMEA route,public EMEA page,https://sucafina.com/emea,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for the team that handles supplier file readiness,not_started,Send importer variant
4,b01-r08,importer,Falcon Coffees Europe,specialty green coffee trader,Public Europe route,public Europe page,https://falconcoffees.com/falcon-europe/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask whether one messy EU supplier file is worth checking,not_started,Send importer variant
5,b01-r11,importer,InterAmerican Coffee Europe,specialty green coffee importer,Public Europe contact route,public website,https://interamericancoffee.de/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for a referral to the person handling supplier geolocation files,not_started,Send importer variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,,European Coffee Federation,association,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r06,,Cafe Imports Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r07,,Sucafina Specialty Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r07,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r08,,Falcon Coffees Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r08,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r11,,InterAmerican Coffee Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

describe("outreach send checklist", () => {
  it("renders private-safe one-by-one send tasks for the next importer routes", () => {
    const markdown = renderOutreachSendChecklist(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results-batch-01.csv",
      today: "2026-06-16",
      sendLimit: 2,
      sendTier: "importer",
    });

    expect(markdown).toContain("# TraceReady send execution checklist");
    expect(markdown).toContain("Results: `private/outreach-results-batch-01.csv`");
    expect(markdown).toContain("Send tier filter: importer");
    expect(markdown).toContain("## 1. b01-r06 - Cafe Imports Europe");
    expect(markdown).toContain("- [ ] Open company-level route: https://www.cafeimports.com/europe/blog/general-contact/");
    expect(markdown).toContain(
      "npm run render:outreach-send-ready -- --batch docs/proof-led-outreach-batch-01.csv --results private/outreach-results-batch-01.csv --sendability-audit private/outreach-sendability-audit-importer.json --route b01-r06 --today 2026-06-16 --output private/send-ready-b01-r06.md",
    );
    expect(markdown).toContain("- [ ] Paste the subject and body exactly as shown below.");
    expect(markdown).toContain("Subject: Row-level check for messy EUDR farm files");
    expect(markdown).toContain("Worth testing one messy supplier file?");
    expect(markdown).toContain(
      "npm run update:outreach-result -- --results private/outreach-results-batch-01.csv --route b01-r06 --date-sent 2026-06-16 --status sent",
    );
    expect(markdown).toContain(
      "npm run render:outreach-replies -- --results private/outreach-results-batch-01.csv --route b01-r06 --output private/replies-b01-r06.md",
    );
    expect(markdown).toContain("## 2. b01-r07 - Sucafina Specialty Europe");
    expect(markdown).not.toContain("European Coffee Federation");
    expect(markdown).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it("parses CLI flags for private checklist rendering", () => {
    expect(
      parseOutreachSendChecklistArgs([
        "--batch",
        "docs/proof-led-outreach-batch-01.csv",
        "--results",
        "private/results.csv",
        "--output",
        "private/send-checklist.md",
        "--day-pack",
        "private/outreach-day-pack-batch-02.md",
        "--today",
        "2026-06-16",
        "--send-limit",
        "3",
        "--send-tier",
        "importer",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/results.csv",
      outputPath: "private/send-checklist.md",
      dayPackPath: "private/outreach-day-pack-batch-02.md",
      today: "2026-06-16",
      sendLimit: 3,
      sendTier: "importer",
    });
  });

  it("uses route audit health to send only reachable routes and surface skipped routes", () => {
    const markdown = renderOutreachSendChecklist(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results-batch-01.csv",
      routeAuditPath: "private/outreach-route-audit.json",
      routeAudit: {
        routes: [
          { route_id: "b01-r06", health: "reachable", status: 200, note: "HTTP 200" },
          { route_id: "b01-r07", health: "unreachable", status: undefined, note: "timed out after 4000ms" },
          { route_id: "b01-r08", health: "reachable", status: 200, note: "HTTP 200" },
        ],
      },
      today: "2026-06-16",
      sendLimit: 2,
      sendTier: "importer",
    });

    expect(markdown).toContain("Route audit: `private/outreach-route-audit.json`");
    expect(markdown).toContain("## 1. b01-r06 - Cafe Imports Europe");
    expect(markdown).toContain("## 2. b01-r08 - Falcon Coffees Europe");
    expect(markdown).not.toContain("## 2. b01-r07 - Sucafina Specialty Europe");
    expect(markdown).toContain("## Skipped By Route Health");
    expect(markdown).toContain("- b01-r07 - Sucafina Specialty Europe: unreachable, timed out after 4000ms");
  });

  it("uses sendability audit evidence to queue browser-form-ready routes before merely reachable routes", () => {
    const markdown = renderOutreachSendChecklist(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results-batch-01.csv",
      sendabilityAuditPath: "private/outreach-sendability-audit-importer.json",
      sendabilityAudit: {
        routes: [
          {
            route_id: "b01-r06",
            sendability: "blocked",
            contact_method: "public_browser_form",
            route_url: "https://www.cafeimports.com/europe/blog/general-contact/",
            blocker: "requires phone and reCAPTCHA",
          },
          {
            route_id: "b01-r11",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://interamericancoffee.de/contact/",
            note: "general coffee/account/contact form",
          },
        ],
      },
      today: "2026-06-16",
      sendLimit: 1,
      sendTier: "importer",
    });

    expect(markdown).toContain("Sendability audit: `private/outreach-sendability-audit-importer.json`");
    expect(markdown).toContain("Sendability gate is active: only audited routes marked browser_form_ready are queued for browser-form sending.");
    expect(markdown).toContain("## 1. b01-r11 - InterAmerican Coffee Europe");
    expect(markdown).toContain("- Sendability: browser_form_ready via public_browser_form");
    expect(markdown).toContain("- [ ] Open company-level route: https://interamericancoffee.de/contact/");
    expect(markdown).toContain(
      "npm run render:outreach-send-ready -- --batch docs/proof-led-outreach-batch-01.csv --results private/outreach-results-batch-01.csv --sendability-audit private/outreach-sendability-audit-importer.json --route b01-r11 --today 2026-06-16 --output private/send-ready-b01-r11.md",
    );
    expect(markdown).toContain("--route b01-r11 --date-sent 2026-06-16 --status sent");
    expect(markdown).not.toContain("## 1. b01-r06 - Cafe Imports Europe");
    expect(markdown).toContain("## Skipped By Sendability");
    expect(markdown).toContain("- b01-r06 - Cafe Imports Europe: blocked, requires phone and reCAPTCHA");
  });

  it("parses a route audit input for private checklist rendering", () => {
    expect(
      parseOutreachSendChecklistArgs([
        "--results",
        "private/results.csv",
        "--route-audit",
        "private/outreach-route-audit.json",
      ]),
    ).toMatchObject({
      resultsPath: "private/results.csv",
      routeAuditPath: "private/outreach-route-audit.json",
    });
  });

  it("parses a sendability audit input for private checklist rendering", () => {
    expect(
      parseOutreachSendChecklistArgs([
        "--results",
        "private/results.csv",
        "--sendability-audit",
        "private/outreach-sendability-audit-importer.json",
      ]),
    ).toMatchObject({
      resultsPath: "private/results.csv",
      sendabilityAuditPath: "private/outreach-sendability-audit-importer.json",
    });
  });

  it("renders send-ready commands against a custom batch path", () => {
    const markdown = renderOutreachSendChecklist(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      batchPath: "docs/proof-led-outreach-batch-02.csv",
      resultsPath: "private/outreach-results-batch-02.csv",
      dayPackPath: "private/outreach-day-pack-batch-02.md",
      sendabilityAuditPath: "private/outreach-sendability-audit-batch-02.json",
      sendabilityAudit: {
        routes: [
          {
            route_id: "b01-r11",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://interamericancoffee.de/contact/",
            note: "general coffee/account/contact form",
          },
        ],
      },
      today: "2026-06-16",
      sendLimit: 1,
      sendTier: "importer",
    });

    expect(markdown).toContain(
      "npm run render:outreach-send-ready -- --batch docs/proof-led-outreach-batch-02.csv --results private/outreach-results-batch-02.csv --sendability-audit private/outreach-sendability-audit-batch-02.json --route b01-r11 --today 2026-06-16 --output private/send-ready-b01-r11.md",
    );
    expect(markdown).toContain(
      "npm run prepare:outreach -- --batch docs/proof-led-outreach-batch-02.csv --results private/outreach-results-batch-02.csv --day-pack private/outreach-day-pack-batch-02.md --today 2026-06-16 --send-limit 1 --send-tier importer",
    );
  });
});
