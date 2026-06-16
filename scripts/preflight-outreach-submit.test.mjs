import { describe, expect, it } from "vitest";
import {
  parseOutreachSubmitPreflightArgs,
  preflightOutreachSubmit,
  renderOutreachSubmitPreflight,
} from "./preflight-outreach-submit.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b02-r03,overflow,Control Union,EUDR certification and service intake,Public EUDR service route exposes an application form and contact path,public EUDR service page,https://www.controlunion.com/eu-deforestation-regulation-eudr/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer malformed CSV KML GeoJSON cleanup before certification intake,not_started,Send overflow variant
2,b02-r04,overflow,Bureau Veritas,EUDR services,Global EUDR service page for operators traders and suppliers,public EUDR service page,https://group.bureauveritas.com/sustainability/nature/eudr,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer first-pass file hygiene for supplier onboarding overflow,not_started,Send overflow variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,not_sent,none,0,0,0,no,,send first message from proof-led packet
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

const RESULTS_SENT_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,not_sent,none,0,0,0,no,,send first message from proof-led packet
b02-r04,2026-06-16,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,sent,none,0,0,0,no,,follow up in 4 business days
`;

const SENDABILITY_AUDIT = {
  auditDate: "2026-06-16",
  routes: [
    {
      route_id: "b02-r03",
      company_or_channel: "Control Union",
      sendability: "blocked",
      contact_method: "public_browser_form",
      route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
      blocker: "live browser form needs manual review",
    },
    {
      route_id: "b02-r04",
      company_or_channel: "Bureau Veritas",
      sendability: "browser_form_ready",
      contact_method: "public_browser_form",
      route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
      note: "required fields are First Name, Email, Country, solution or service of interest, data-processing consent, and Comments",
      requires_action_time_confirmation: true,
    },
  ],
};

const SEND_READY_PACKET = `# TraceReady send-ready packet: b02-r04

Target: Bureau Veritas
Public route: https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv

\`\`\`text
Confirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.
\`\`\`

## Message

Exact issue counts out: 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.
`;

describe("outreach submit preflight", () => {
  it("renders a safe action-time checklist for a browser-form-ready unsent route", () => {
    const preflight = preflightOutreachSubmit({
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_CSV),
      sendabilityAudit: SENDABILITY_AUDIT,
      sendReadyMarkdown: SEND_READY_PACKET,
      routeId: "b02-r04",
      sendReadyPath: "private/send-ready-b02-r04.md",
      resultsPath: "private/outreach-results-batch-02.csv",
      emailReport: { ready: false },
    });
    const markdown = renderOutreachSubmitPreflight(preflight, { generatedAt: "2026-06-16" });

    expect(preflight.replyCapture).toBe("at_risk");
    expect(markdown).toContain("# TraceReady submit preflight: b02-r04");
    expect(markdown).toContain(
      'OUTREACH_SUBMIT_PREFLIGHT=pass route=b02-r04 company="Bureau Veritas" reply_capture=at_risk',
    );
    expect(markdown).toContain("Public route: https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv");
    expect(markdown).toContain("Result ledger status: `not_sent`");
    expect(markdown).toContain("Send-ready packet: `private/send-ready-b02-r04.md`");
    expect(markdown).toContain(
      "Confirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.",
    );
    expect(markdown).toContain("Do not submit until that exact confirmation has been given at action time.");
    expect(markdown).toContain("Only run this after visible browser success");
  });

  it("refuses a route that was already sent", () => {
    expect(() =>
      preflightOutreachSubmit({
        batchRows: parseOutreachLedger(BATCH_CSV),
        resultRows: parseOutreachResults(RESULTS_SENT_CSV),
        sendabilityAudit: SENDABILITY_AUDIT,
        sendReadyMarkdown: SEND_READY_PACKET,
        routeId: "b02-r04",
        sendReadyPath: "private/send-ready-b02-r04.md",
      }),
    ).toThrow("route b02-r04 is already sent");
  });

  it("refuses a packet that lacks the exact action-time confirmation line", () => {
    expect(() =>
      preflightOutreachSubmit({
        batchRows: parseOutreachLedger(BATCH_CSV),
        resultRows: parseOutreachResults(RESULTS_CSV),
        sendabilityAudit: SENDABILITY_AUDIT,
        sendReadyMarkdown: SEND_READY_PACKET.replace("Confirm: submit b02-r04", "Confirm: draft b02-r04"),
        routeId: "b02-r04",
        sendReadyPath: "private/send-ready-b02-r04.md",
      }),
    ).toThrow("send-ready packet for b02-r04 is missing the exact action-time confirmation");
  });

  it("refuses a route that is not browser-form-ready", () => {
    expect(() =>
      preflightOutreachSubmit({
        batchRows: parseOutreachLedger(BATCH_CSV),
        resultRows: parseOutreachResults(RESULTS_CSV),
        sendabilityAudit: SENDABILITY_AUDIT,
        sendReadyMarkdown: SEND_READY_PACKET,
        routeId: "b02-r03",
        sendReadyPath: "private/send-ready-b02-r03.md",
      }),
    ).toThrow("route b02-r03 is not browser_form_ready");
  });

  it("parses CLI flags for a route-specific submit preflight", () => {
    expect(
      parseOutreachSubmitPreflightArgs([
        "--batch",
        "docs/proof-led-outreach-batch-02.csv",
        "--results",
        "private/outreach-results-batch-02.csv",
        "--sendability-audit",
        "private/outreach-sendability-audit-batch-02.json",
        "--send-ready",
        "private/send-ready-b02-r04.md",
        "--route",
        "b02-r04",
        "--output",
        "private/preflight-submit-b02-r04.md",
        "--today",
        "2026-06-16",
        "--skip-email",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-02.csv",
      resultsPath: "private/outreach-results-batch-02.csv",
      sendabilityAuditPath: "private/outreach-sendability-audit-batch-02.json",
      sendReadyPath: "private/send-ready-b02-r04.md",
      routeId: "b02-r04",
      outputPath: "private/preflight-submit-b02-r04.md",
      generatedAt: "2026-06-16",
      skipEmail: true,
    });
  });
});
