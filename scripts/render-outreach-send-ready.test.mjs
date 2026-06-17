import { describe, expect, it } from "vitest";
import {
  parseOutreachSendReadyArgs,
  renderOutreachSendReadyPacket,
} from "./render-outreach-send-ready.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r11,importer,InterAmerican Coffee Europe,specialty green coffee importer,European specialty green coffee importer within Neumann Kaffee Gruppe,public website,https://interamericancoffee.de/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots as row-level cleanup proof",Ask for a referral to the person handling supplier geolocation files,not_started,Send importer variant
2,b01-r12,importer,EFICO,green coffee specialist,Belgian green coffee specialist connecting farmers and roasters,public website,https://efico.com/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots as file-readiness evidence",Ask whether one coffee or cocoa supplier file can be checked,not_started,Send importer variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r11,,InterAmerican Coffee Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r12,,EFICO,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r12,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

const SENDABILITY_AUDIT = {
  auditDate: "2026-06-16",
  routes: [
    {
      route_id: "b01-r11",
      company_or_channel: "InterAmerican Coffee Europe",
      sendability: "browser_form_ready",
      contact_method: "public_browser_form",
      route_url: "https://interamericancoffee.de/contact/",
      note: "general coffee/account/contact form; required fields are first name, last name, work email, subject, message, and privacy acceptance",
      public_inbox: "iac.hamburg@nkg.coffee",
      requires_action_time_confirmation: true,
    },
    {
      route_id: "b01-r12",
      company_or_channel: "EFICO",
      sendability: "blocked",
      contact_method: "public_browser_form",
      route_url: "https://efico.com/",
      blocker: "visible form requires privacy consent and CAPTCHA",
    },
  ],
};

describe("outreach send-ready packet renderer", () => {
  it("renders an action-time-confirmed private browser-form packet for a ready route", () => {
    const markdown = renderOutreachSendReadyPacket(
      parseOutreachLedger(BATCH_CSV),
      parseOutreachResults(RESULTS_CSV),
      SENDABILITY_AUDIT,
      {
        routeId: "b01-r11",
        today: "2026-06-16",
        resultsPath: "private/outreach-results-batch-01.csv",
      },
    );

    expect(markdown).toContain("# TraceReady send-ready packet: b01-r11");
    expect(markdown).toContain("Target: InterAmerican Coffee Europe");
    expect(markdown).toContain("Public route: https://interamericancoffee.de/contact/");
    expect(markdown).toContain("Verified company-level inbox: `iac.hamburg@nkg.coffee`");
    expect(markdown).toContain("Do not type into the form or submit until explicit action-time confirmation.");
    expect(markdown).toContain(
      "Confirm: submit b01-r11 to InterAmerican Coffee Europe using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b01-r11.md.",
    );
    expect(markdown).toContain("Required fields: first name, last name, work email, subject, message, and privacy acceptance");
    expect(markdown).toContain("- First name: `TraceReady`");
    expect(markdown).toContain("- Last name: `Desk`");
    expect(markdown).toContain("- Work email: `founder@traceready.online`");
    expect(markdown).toContain("- Registered Company Name: `Passive Print Labs LLC / TraceReady`");
    expect(markdown).toContain("- Honeypot / company website: leave blank");
    expect(markdown).toContain("Subject: `Row-level check for messy EUDR farm files`");
    expect(markdown).toContain("46,134 point-only plots over 4 hectares");
    expect(markdown).toContain("TraceReady is a spreadsheet bouncer");
    expect(markdown).toContain("Public proof beats biography here");
    expect(markdown).toContain("Worth testing one messy supplier file?");
    expect(markdown).toContain("Only run this after visible browser success");
    expect(markdown).toContain("--route b01-r11 --date-sent 2026-06-16 --status sent");
    expect(markdown).toContain("npm run summarize:outreach -- private/outreach-results-batch-01.csv");
  });

  it("refuses to render a send-ready packet for a blocked route", () => {
    expect(() =>
      renderOutreachSendReadyPacket(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), SENDABILITY_AUDIT, {
        routeId: "b01-r12",
      }),
    ).toThrow("route b01-r12 is not browser_form_ready");
  });

  it("parses CLI flags for a private send-ready packet", () => {
    expect(
      parseOutreachSendReadyArgs([
        "--batch",
        "docs/proof-led-outreach-batch-01.csv",
        "--results",
        "private/results.csv",
        "--sendability-audit",
        "private/audit.json",
        "--route",
        "b01-r11",
        "--output",
        "private/send-ready-b01-r11.md",
        "--today",
        "2026-06-16",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/results.csv",
      sendabilityAuditPath: "private/audit.json",
      routeId: "b01-r11",
      outputPath: "private/send-ready-b01-r11.md",
      today: "2026-06-16",
    });
  });
});
