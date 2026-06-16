import { describe, expect, it } from "vitest";
import {
  renderOutreachSendabilityAuditSummary,
  validateOutreachSendabilityAudit,
} from "./verify-outreach-sendability.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r06,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_content=b01-r06,https://traceready.online/?utm_content=b01-r06,https://traceready.online/pilot-proof/?utm_content=b01-r06,importer,"Lead with proof",Ask them to run one supplier file browser-side,not_started,Send importer variant
2,b01-r11,importer,InterAmerican Coffee Europe,specialty green coffee importer,Public Europe contact route,public website,https://interamericancoffee.de/,https://traceready.online/proof/?utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_content=b01-r11,https://traceready.online/?utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_content=b01-r11,importer,"Lead with proof",Ask for a referral to the person handling supplier geolocation files,not_started,Send importer variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r06,,Cafe Imports Europe,importer,https://traceready.online/proof/?utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_content=b01-r06,https://traceready.online/?utm_content=b01-r06,https://traceready.online/pilot-proof/?utm_content=b01-r06,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r11,,InterAmerican Coffee Europe,importer,https://traceready.online/proof/?utm_content=b01-r11,https://traceready.online/field-notes/eudr-file-errors/?utm_content=b01-r11,https://traceready.online/?utm_content=b01-r11,https://traceready.online/pilot-proof/?utm_content=b01-r11,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

describe("outreach sendability audit verification", () => {
  it("passes a private audit with one action-confirmed browser-form-ready route", () => {
    const audit = {
      routes: [
        {
          route_id: "b01-r06",
          company_or_channel: "Cafe Imports Europe",
          sendability: "blocked",
          contact_method: "public_browser_form",
          route_url: "https://www.cafeimports.com/europe/blog/general-contact/",
          blocker: "form requires phone and reCAPTCHA",
        },
        {
          route_id: "b01-r11",
          company_or_channel: "InterAmerican Coffee Europe",
          sendability: "browser_form_ready",
          contact_method: "public_browser_form",
          route_url: "https://interamericancoffee.de/contact/",
          note: "general coffee/account/contact form",
          requires_action_time_confirmation: true,
        },
      ],
    };

    expect(
      validateOutreachSendabilityAudit(audit, parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV)),
    ).toEqual([]);
    expect(renderOutreachSendabilityAuditSummary(audit, "private/outreach-sendability-audit-importer.json")).toBe(
      "OUTREACH_SENDABILITY_AUDIT=pass routes=2 browser_form_ready=1 blocked=1 path=private/outreach-sendability-audit-importer.json",
    );
  });

  it("rejects ready routes that would transmit form data without explicit action-time confirmation", () => {
    const audit = {
      routes: [
        {
          route_id: "b01-r11",
          company_or_channel: "InterAmerican Coffee Europe",
          sendability: "browser_form_ready",
          contact_method: "public_browser_form",
          route_url: "https://interamericancoffee.de/contact/",
        },
      ],
    };

    expect(
      validateOutreachSendabilityAudit(audit, parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV)),
    ).toContain("b01-r11 browser_form_ready routes must set requires_action_time_confirmation=true");
  });

  it("rejects stale or malformed private audit routes before they can drive the send checklist", () => {
    const audit = {
      routes: [
        {
          route_id: "b01-r99",
          company_or_channel: "Unknown Coffee",
          sendability: "browser_form_ready",
          contact_method: "mailto_only",
          route_url: "not a url",
          requires_action_time_confirmation: true,
        },
        {
          route_id: "b01-r06",
          company_or_channel: "Cafe Imports Europe",
          sendability: "blocked",
          contact_method: "public_browser_form",
          route_url: "https://www.cafeimports.com/europe/blog/general-contact/",
        },
      ],
    };

    expect(
      validateOutreachSendabilityAudit(audit, parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV)),
    ).toEqual([
      "b01-r99 is not in the outreach batch",
      "b01-r99 is not in the private results ledger",
      "b01-r99 route_url must be an http(s) URL",
      "b01-r99 browser_form_ready routes must use contact_method=public_browser_form",
      "b01-r06 blocked routes must include blocker text",
    ]);
  });
});
