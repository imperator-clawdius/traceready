import { describe, expect, it } from "vitest";
import {
  parseTractionReadinessArgs,
  renderTractionReadinessScorecard,
  scoreTractionReadiness,
  tractionReadinessStatus,
} from "./score-traction-readiness.mjs";
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

const RESULTS_WITH_EVIDENCED_SENT_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,2026-06-16,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,sent,none,0,0,0,no,sent via Control Union public contact form; visible form success observed; submission evidence: submission-evidence-b02-r03.json,follow up in 4 business days
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message
`;

const RESULTS_WITH_VISIBLE_ONLY_SENT_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,2026-06-16,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,sent,none,0,0,0,no,sent via Control Union public contact form; visible form success observed,follow up in 4 business days
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message
`;

const RESULTS_WITH_UNEVIDENCED_SENT_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,2026-06-16,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,sent,none,0,0,0,no,sent manually,follow up in 4 business days
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message
`;

const RESULTS_WITH_TRACTION_SIGNAL_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b02-r03,2026-06-16,Control Union,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,replied,file_check,1,1,0,no,asked for one supplier file check,follow up with issue-count-first intake
b02-r04,,Bureau Veritas,overflow,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,not_sent,none,0,0,0,no,,send first message
`;

const TRUST_BRIDGE_LINE = "Trust bridge: TraceReady is a spreadsheet bouncer";

const SEND_READY_CONFIRMATIONS = {
  "b02-r03": "Confirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.",
  "b02-r04": "Confirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.",
};

const SEND_READY_PACKETS = Object.fromEntries(
  Object.entries(SEND_READY_CONFIRMATIONS).map(([routeId, confirmation]) => [
    routeId,
    `${TRUST_BRIDGE_LINE}\n${confirmation}\nnpm run record:submission-evidence -- --route ${routeId}`,
  ]),
);

const SUBMIT_PREFLIGHT_PACKETS = {
  "b02-r03": 'OUTREACH_SUBMIT_PREFLIGHT=pass route=b02-r03 company="Control Union" reply_capture=ready\nConfirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.',
  "b02-r04": 'OUTREACH_SUBMIT_PREFLIGHT=pass route=b02-r04 company="Bureau Veritas" reply_capture=ready\nConfirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.',
};

const SUBMIT_PREFLIGHT_PACKETS_AT_RISK = {
  "b02-r03": 'OUTREACH_SUBMIT_PREFLIGHT=pending route=b02-r03 company="Control Union" reply_capture=at_risk\nConfirm: submit b02-r03 to Control Union using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r03.md.',
  "b02-r04": 'OUTREACH_SUBMIT_PREFLIGHT=pending route=b02-r04 company="Bureau Veritas" reply_capture=at_risk\nConfirm: submit b02-r04 to Bureau Veritas using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-b02-r04.md.',
};

const LIVE_SUBMIT_REPORT_PASS = `# TraceReady live submit route check - 2026-06-17

OUTREACH_SUBMIT_LIVE=pass ready_routes=2 live_ready=2 blocked=0 captcha=0

## Blocking Sets

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | none |
| Queue URL differs from sendability audit | none |
| Fetch errors | none |
| HTTP blocked | none |
| CAPTCHA or browser challenge marker | none |
`;

const LIVE_SUBMIT_REPORT_PENDING = `# TraceReady live submit route check - 2026-06-17

OUTREACH_SUBMIT_LIVE=pending ready_routes=2 live_ready=1 blocked=1 captcha=0

## Blocking Sets

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | none |
| Queue URL differs from sendability audit | none |
| Fetch errors | none |
| HTTP blocked | \`b02-r04\` |
| CAPTCHA or browser challenge marker | none |
`;

const LIVE_SUBMIT_REPORT_REPLY_CAPTURE_RISK = `# TraceReady live submit route check - 2026-06-17

OUTREACH_SUBMIT_LIVE=pending ready_routes=2 live_ready=0 blocked=0 captcha=0 reply_capture_held=2

## Route Checks

| Route | Target | HTTP | Status | Issue | URL |
| --- | --- | ---: | --- | --- | --- |
| \`b02-r03\` | Control Union | \`200\` | pending | reply capture not ready | https://www.controlunion.com/eu-deforestation-regulation-eudr/ |
| \`b02-r04\` | Bureau Veritas | \`200\` | pending | reply capture not ready | https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv |

## Blocking Sets

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | none |
| Queue URL differs from sendability audit | none |
| Fetch errors | none |
| HTTP blocked | none |
| CAPTCHA or browser challenge marker | none |
| Reachable but held by reply capture | \`b02-r03\`, \`b02-r04\` |
| Reply capture not ready | \`b02-r03\`, \`b02-r04\` |
`;

const LIVE_SUBMIT_REPORT_QUEUE_HEADER_ERROR = `# TraceReady live submit route check - 2026-06-17

OUTREACH_SUBMIT_LIVE=pending ready_routes=2 live_ready=0 blocked=0 captcha=0 reply_capture_held=2

## Route Checks

| Route | Target | HTTP | Status | Issue | URL |
| --- | --- | ---: | --- | --- | --- |
| \`b02-r03\` | Control Union | \`200\` | pending | reply capture not ready | https://www.controlunion.com/eu-deforestation-regulation-eudr/ |
| \`b02-r04\` | Bureau Veritas | \`200\` | pending | reply capture not ready | https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv |

## Blocking Sets

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | none |
| Queue URL differs from sendability audit | none |
| Submit queue header errors | submit queue header must include held_preflights |
| Fetch errors | none |
| HTTP blocked | none |
| CAPTCHA or browser challenge marker | none |
| Reachable but held by reply capture | \`b02-r03\`, \`b02-r04\` |
| Reply capture not ready | \`b02-r03\`, \`b02-r04\` |
`;

const REPLY_CAPTURE_READY_EMAIL = {
  ready: false,
  dnsReady: false,
  checks: [
    { label: "OUTREACH_EMAIL_MX", ready: true },
    { label: "OUTREACH_EMAIL_DMARC", ready: false },
    { label: "OUTREACH_EMAIL_DKIM", ready: false },
    { label: "OUTREACH_EMAIL_ALIAS_TEST", ready: true },
  ],
};

const REPLY_CAPTURE_AT_RISK_EMAIL = {
  ready: false,
  dnsReady: false,
  checks: [
    { label: "OUTREACH_EMAIL_MX", ready: true },
    { label: "OUTREACH_EMAIL_DMARC", ready: false },
    { label: "OUTREACH_EMAIL_DKIM", ready: false },
    { label: "OUTREACH_EMAIL_ALIAS_TEST", ready: false },
  ],
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
    });

    expect(score.publicProof.recordsAnalyzed).toBe(57658);
    expect(score.publicProof.pointOnlyOver4ha).toBe(46134);
    expect(score.publicProof.readinessScore).toBe("0/100");
    expect(score.outreach.readyBrowserFormRoutes).toBe(2);
    expect(score.outreach.packetReadyRoutes).toBe(2);
    expect(score.outreach.missingPacketRoutes).toEqual([]);
    expect(score.outreach.sentOrBeyond).toBe(0);
    expect(score.currentState).toBe("proof_ready_reply_capture_at_risk_traction_unmeasured");
    expect(score.nextGate).toBe("verify_reply_capture_before_external_submission");
    expect(tractionReadinessStatus(score)).toBe("pending");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-16" });
    expect(markdown).toContain("# TraceReady traction-readiness scorecard - 2026-06-16");
    expect(markdown).toContain("| Public rows analyzed | 57,658 |");
    expect(markdown).toContain("| Manually verified browser-form-ready routes | 2 |");
    expect(markdown).toContain("| Send-ready packets with matching confirmation | 2 |");
    expect(markdown).toContain("| External submissions completed | 0 |");
    expect(markdown).toContain("| OUTREACH_EMAIL_REPLY_CAPTURE | pending |");
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
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

  it("does not count stale submit preflights with at-risk reply capture as ready", () => {
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS_AT_RISK,
    });

    expect(score.outreach.submitPreflightReadyRoutes).toBe(0);
    expect(score.outreach.missingSubmitPreflightConfirmationRoutes).toEqual([]);
    expect(score.outreach.submitPreflightReplyCaptureHeldRoutes).toEqual(["b02-r03", "b02-r04"]);
    expect(score.currentState).toBe("proof_ready_reply_capture_at_risk_traction_unmeasured");
    expect(score.nextGate).toBe("verify_reply_capture_before_external_submission");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Submit preflights with matching confirmation | 0 |");
    expect(markdown).toContain("| Submit preflights missing confirmation | none |");
    expect(markdown).toContain("| Submit preflights held by reply capture | `b02-r03`, `b02-r04` |");
  });

  it("promotes submit-ready routes when a live submit route report is passing", () => {
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
      liveSubmitReport: LIVE_SUBMIT_REPORT_PASS,
    });

    expect(score.outreach.liveSubmitStatus).toBe("pass");
    expect(score.outreach.liveSubmitCheckedRoutes).toBe(2);
    expect(score.outreach.liveSubmitReadyRoutes).toBe(2);
    expect(score.outreach.liveSubmitBlockedRoutes).toBe(0);
    expect(score.outreach.liveSubmitCaptchaRoutes).toBe(0);
    expect(score.currentState).toBe("proof_ready_live_submit_ready_traction_unmeasured");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Live submit route report status | pass |");
    expect(markdown).toContain("| Live submit routes checked | 2 |");
    expect(markdown).toContain("| Live submit routes ready | 2 |");
    expect(markdown).toContain("| Live submit routes HTTP-blocked | 0 |");
    expect(markdown).toContain("| Live submit routes CAPTCHA/challenge | 0 |");
    expect(markdown).toContain("## Live Submit Route Guard");
    expect(markdown).toContain("| OUTREACH_EMAIL_REPLY_CAPTURE | pass |");
  });

  it("does not call live submit-ready routes actionable until reply capture is verified", () => {
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
      liveSubmitReport: LIVE_SUBMIT_REPORT_PASS,
    });

    expect(score.email.replyCaptureReady).toBe(false);
    expect(score.currentState).toBe("proof_ready_reply_capture_at_risk_traction_unmeasured");
    expect(score.nextGate).toBe("verify_reply_capture_before_external_submission");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| OUTREACH_EMAIL_REPLY_CAPTURE | pending |");
    expect(markdown).toContain("Reply capture must pass before treating non-response as market evidence.");
  });

  it("blocks action-time submission when the live submit route report has route blockers", () => {
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
      liveSubmitReport: LIVE_SUBMIT_REPORT_PENDING,
    });

    expect(score.outreach.liveSubmitStatus).toBe("pending");
    expect(score.outreach.liveSubmitCheckedRoutes).toBe(2);
    expect(score.outreach.liveSubmitReadyRoutes).toBe(1);
    expect(score.outreach.liveSubmitBlockedRoutes).toBe(1);
    expect(score.currentState).toBe("proof_ready_live_submit_routes_blocked");
    expect(score.nextGate).toBe("refresh_or_replace_blocked_submit_routes");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| HTTP blocked | `b02-r04` |");
  });

  it("keeps reply-capture-at-risk as the next gate when live routes are blocked only by reply capture", () => {
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS_AT_RISK,
      liveSubmitReport: LIVE_SUBMIT_REPORT_REPLY_CAPTURE_RISK,
    });

    expect(score.outreach.liveSubmitStatus).toBe("pending");
    expect(score.outreach.liveSubmitCheckedRoutes).toBe(2);
    expect(score.outreach.liveSubmitReadyRoutes).toBe(0);
    expect(score.outreach.liveSubmitReplyCaptureHeldRoutes).toEqual(["b02-r03", "b02-r04"]);
    expect(score.outreach.liveSubmitReplyCaptureRiskRoutes).toEqual(["b02-r03", "b02-r04"]);
    expect(score.currentState).toBe("proof_ready_reply_capture_at_risk_traction_unmeasured");
    expect(score.nextGate).toBe("verify_reply_capture_before_external_submission");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Live submit routes held by reply capture | 2 |");
    expect(markdown).toContain("| Reachable but held by reply capture | `b02-r03`, `b02-r04` |");
    expect(markdown).toContain("| Reply capture not ready | `b02-r03`, `b02-r04` |");
  });

  it("surfaces live submit queue header errors instead of hiding them behind reply-capture risk", () => {
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
      emailReport: REPLY_CAPTURE_AT_RISK_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS_AT_RISK,
      liveSubmitReport: LIVE_SUBMIT_REPORT_QUEUE_HEADER_ERROR,
    });

    expect(score.outreach.liveSubmitQueueHeaderErrors).toEqual([
      "submit queue header must include held_preflights",
    ]);
    expect(score.currentState).toBe("proof_ready_live_submit_routes_blocked");
    expect(score.nextGate).toBe("refresh_or_replace_blocked_submit_routes");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Submit queue header errors | submit queue header must include held_preflights |");
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: {
        "b02-r03": SEND_READY_PACKETS["b02-r03"],
      },
    });

    expect(score.outreach.packetReadyRoutes).toBe(1);
    expect(score.outreach.missingPacketRoutes).toEqual(["b02-r04"]);
    expect(score.currentState).toBe("proof_ready_routes_need_send_packets");
    expect(score.nextGate).toBe("render_missing_send_ready_packets");
  });

  it("flags send-ready packets that have confirmation but stale message copy", () => {
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: {
        "b02-r03": SEND_READY_PACKETS["b02-r03"],
        "b02-r04": SEND_READY_CONFIRMATIONS["b02-r04"],
      },
    });

    expect(score.outreach.packetReadyRoutes).toBe(1);
    expect(score.outreach.missingPacketTrustBridgeRoutes).toEqual(["b02-r04"]);
    expect(score.currentState).toBe("proof_ready_routes_need_send_packets");
    expect(score.nextGate).toBe("render_missing_send_ready_packets");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Send-ready packets missing trust bridge | `b02-r04` |");
  });

  it("flags send-ready packets that bypass the submission evidence recorder", () => {
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: {
        "b02-r03": SEND_READY_PACKETS["b02-r03"],
        "b02-r04": `${TRUST_BRIDGE_LINE}\n${SEND_READY_CONFIRMATIONS["b02-r04"]}\nnpm run update:outreach-result -- --route b02-r04`,
      },
    });

    expect(score.outreach.packetReadyRoutes).toBe(1);
    expect(score.outreach.missingPacketSubmissionEvidenceRoutes).toEqual(["b02-r04"]);
    expect(score.currentState).toBe("proof_ready_routes_need_send_packets");
    expect(score.nextGate).toBe("render_missing_send_ready_packets");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-17" });
    expect(markdown).toContain("| Send-ready packets missing submission-evidence recorder | `b02-r04` |");
  });

  it("counts external submissions only when the sent row carries visible-success evidence", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_WITH_EVIDENCED_SENT_CSV),
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
    });

    expect(score.outreach.sentOrBeyond).toBe(1);
    expect(score.outreach.evidenceBackedSubmissions).toBe(1);
    expect(score.outreach.unevidencedSentRoutes).toEqual([]);
    expect(score.currentState).toBe("outreach_sent_waiting_for_signal");

    const markdown = renderTractionReadinessScorecard(score, { generatedAt: "2026-06-16" });
    expect(markdown).toContain("| Evidence-backed submissions | 1 |");
    expect(markdown).toContain("| Sent rows missing submission evidence | 0 |");
    expect(markdown).toContain("## Submission Evidence Guard");
  });

  it("does not treat visible-success-only notes as submission evidence", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_WITH_VISIBLE_ONLY_SENT_CSV),
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
    });

    expect(score.outreach.sentOrBeyond).toBe(1);
    expect(score.outreach.evidenceBackedSubmissions).toBe(0);
    expect(score.outreach.unevidencedSentRoutes).toEqual(["b02-r03"]);
    expect(score.currentState).toBe("outreach_sent_needs_submission_evidence");
  });

  it("flags sent rows that do not carry visible-success evidence", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_WITH_UNEVIDENCED_SENT_CSV),
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
    });

    expect(score.outreach.sentOrBeyond).toBe(1);
    expect(score.outreach.evidenceBackedSubmissions).toBe(0);
    expect(score.outreach.unevidencedSentRoutes).toEqual(["b02-r03"]);
    expect(score.currentState).toBe("outreach_sent_needs_submission_evidence");
    expect(score.nextGate).toBe("record_visible_success_evidence_before_measuring_traction");
    expect(tractionReadinessStatus(score)).toBe("pending");
  });

  it("reports traction readiness as pass only when a real market signal is present", () => {
    const score = scoreTractionReadiness({
      publicAuditMarkdown: PUBLIC_AUDIT,
      batchRows: parseOutreachLedger(BATCH_CSV),
      resultRows: parseOutreachResults(RESULTS_WITH_TRACTION_SIGNAL_CSV),
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
      emailReport: REPLY_CAPTURE_READY_EMAIL,
      sendReadyPackets: SEND_READY_PACKETS,
      submitPreflightPackets: SUBMIT_PREFLIGHT_PACKETS,
    });

    expect(score.currentState).toBe("traction_signal_present");
    expect(score.outreach.replies).toBe(1);
    expect(score.outreach.fileChecks).toBe(1);
    expect(tractionReadinessStatus(score)).toBe("pass");
  });

  it("parses the private reply-capture evidence gate for scoring", () => {
    expect(
      parseTractionReadinessArgs([
        "--output",
        "private/traction-readiness-scorecard-2026-06-17.md",
        "--today",
        "2026-06-17",
        "--reply-capture-evidence",
        "private/reply-capture-evidence.json",
        "--reply-capture-challenge",
        "private/reply-capture-challenge.json",
      ]),
    ).toMatchObject({
      outputPath: "private/traction-readiness-scorecard-2026-06-17.md",
      generatedAt: "2026-06-17",
      replyCaptureEvidencePath: "private/reply-capture-evidence.json",
      replyCaptureChallengePath: "private/reply-capture-challenge.json",
    });
  });
});
