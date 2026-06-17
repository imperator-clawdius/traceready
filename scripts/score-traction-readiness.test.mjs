import { describe, expect, it } from "vitest";
import { renderTractionReadinessScorecard, scoreTractionReadiness } from "./score-traction-readiness.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";

const PUBLIC_AUDIT = `# TraceReady public dataset mini-audit

| Check | Count |
| --- | ---: |
| Records analyzed | 57,658 |
| Records with latitude/longitude | 57,658 |
| Records over 4 hectares | 46,134 |
| Polygon records present | 0 |
| Point-only plots over 4 hectares | 46,134 |
| Ready records | 0 |
| Readiness score | 0/100 |

| TraceReady issue | Count |
| --- | ---: |
| missing_farmId | 57,658 |
| missing_supplier | 57,658 |
`;

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b02-r03,overflow,Control Union,EUDR certification,Public EUDR service route,public EUDR service page,https://www.controlunion.com/eu-deforestation-regulation-eudr/,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,overflow,"Lead with 57,658-row public audit",Offer malformed file cleanup,not_started,Send overflow variant
2,b02-r04,overflow,Bureau Veritas,EUDR services,Public EUDR service route,public EUDR page,https://group.bureauveritas.com/sustainability/nature/eudr,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,overflow,"Lead with 57,658-row public audit",Offer first-pass file hygiene,not_started,Send overflow variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,not_sent,none,0,0,0,no,,send first message
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message
`;

const SEND_READY_PACKETS = {
  "b02-r03": "Confirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.",
  "b02-r04": "Confirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.",
};

const SUBMIT_PREFLIGHT_PACKETS = {
  "b02-r03": 'OUTREACH_SUBMIT_PREFLIGHT=pass route=b02-r03 company="Control Union" reply_capture=at_risk\nConfirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.',
  "b02-r04": 'OUTREACH_SUBMIT_PREFLIGHT=pass route=b02-r04 company="Bureau Veritas" reply_capture=at_risk\nConfirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.',
};

describe("traction readiness scorecard", () => {
  it("separates quantified proof, ready routes, unmeasured traction, and email risk", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_CSV),
      sendabilityAudit: {
        routes: [
          {
            route_id: "b02-r03",
            company_or_channel: "Control Union",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
            requires_action_time_confirmation: true,
          },
          {
            route_id: "b02-r04",
            company_or_channel: "Bureau Veritas",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
            requires_action_time_confirmation: true,
          },
        ],
      },
      contactRecon: {
        summary: {
          routesInspected: 2,
          candidateBrowserForm: 2,
          formWithCaptcha: 0,
          contactLinkOnly: 0,
          unreachable: 0,
        },
      },
      emailReport: {
        ready: false,
        dnsReady: false,
        checks: [
          { label: "OUTREACH_EMAIL_MX", ready: true },
          { label: "OUTREACH_EMAIL_DMARC", ready: false },
          { label: "OUTREACH_EMAIL_DKIM", ready: false },
          { label: "OUTREACH_EMAIL_ALIAS_TEST", ready: false },
        ],
      },
      sendReadyPackets: SEND_READY_PACKETS,
    });

    expect(score.publicProof.recordsAnalyzed).toBe(57658);
    expect(score.publicProof.pointOnlyOver4ha).toBe(46134);
    expect(score.publicProof.readinessScore).toBe("0/100");
    expect(score.outreach.readyBrowserFormRoutes).toBe(2);
    expect(score.outreach.packetReadyRoutes).toBe(2);
    expect(score.outreach.missingPacketRoutes).toEqual([]);
    expect(score.outreach.sentOrBeyond).toBe(0);
    expect(score.currentState).toBe("proof_ready_send_ready_traction_unmeasured");
    expect(score.nextGate).toBe("submit_verified_public_forms_after_action_time_confirmation");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-16" });
    expect(markdown).toContain("# TraceReady traction-readiness scorecard - 2026-06-16");
    expect(markdown).toContain("| Public rows analyzed | 57,658 |");
    expect(markdown).toContain("| Manually verified browser-form-ready routes | 2 |");
    expect(markdown).toContain("| Send-ready packets with matching confirmation | 2 |");
    expect(markdown).toContain("| External submissions completed | 0 |");
    expect(markdown).toContain("OUTREACH_EMAIL_DMARC: pending");
    expect(markdown).toContain("Confirm: submit b02-r03 to Control Union");
    expect(markdown).toContain("Confirm: submit b02-r04 to Bureau Veritas");
  });

  it("separates send-ready packets from submit-preflight-ready packets", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_CSV),
      sendabilityAudit: {
        routes: [
          {
            route_id: "b02-r03",
            company_or_channel: "Control Union",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
            requires_action_time_confirmation: true,
          },
          {
            route_id: "b02-r04",
            company_or_channel: "Bureau Veritas",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
            requires_action_time_confirmation: true,
          },
        ],
      },
      contactRecon: { summary: {} },
      emailReport: { ready: false, dnsReady: false, checks: [] },
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
    });

    expect(score.outreach.packetReadyRoutes).toBe(2);
    expect(score.outreach.submitPreflightReadyRoutes).toBe(2);
    expect(score.outreach.missingSubmitPreflightRoutes).toEqual([]);
    expect(score.outreach.missingSubmitPreflightConfirmationRoutes).toEqual([]);
    expect(score.currentState).toBe("proof_ready_submit_preflight_ready_traction_unmeasured");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-16" });
    expect(markdown).toContain("| Submit preflights with matching confirmation | 2 |");
    expect(markdown).toContain("| Missing submit preflights | 0 |");
    expect(markdown).toContain("| Submit preflights missing confirmation | 0 |");
    expect(markdown).toContain("## Submit Preflight Guard");
  });

  it("changes the next gate when a browser-form-ready route is missing a matching send packet", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_CSV),
      sendabilityAudit: {
        routes: [
          {
            route_id: "b02-r03",
            company_or_channel: "Control Union",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
            requires_action_time_confirmation: true,
          },
          {
            route_id: "b02-r04",
            company_or_channel: "Bureau Veritas",
            sendability: "browser_form_ready",
            contact_method: "public_browser_form",
            route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
            requires_action_time_confirmation: true,
          },
        ],
      },
      contactRecon: { summary: {} },
      emailReport: { ready: false, dnsReady: false, checks: [] },
      sendReadyPackets: {
        "b02-r03": "Confirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.",
      },
    });

    expect(score.outreach.packetReadyRoutes).toBe(1);
    expect(score.outreach.missingPacketRoutes).toEqual(["b02-r04"]);
    expect(score.currentState).toBe("proof_ready_routes_need_send_packets");
    expect(score.nextGate).toBe("render_missing_send_ready_packets");
  });
});
