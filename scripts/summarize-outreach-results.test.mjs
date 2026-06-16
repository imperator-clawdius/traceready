import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseOutreachResults,
  renderOutreachResultsSummary,
  summarizeOutreachResults,
  validateOutreachResults,
} from "./summarize-outreach-results.mjs";

describe("outreach results summarizer", () => {
  it("calculates the proof-led outreach funnel from result rows", () => {
    const rows = parseOutreachResults(`route_id,date_sent,company_or_channel,tier,proof_url,file_check_url,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,2026-06-16,Cafe Imports Europe,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,sent,none,0,0,no,,follow up
b01-r02,2026-06-16,European Coffee Federation,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,replied,referral,0,0,no,shared member channel,follow referral
b01-r03,2026-06-16,Nordic Approach,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,file_checked,file_check,2,0,no,ran browser-side check,ask for cleanup
b01-r04,2026-06-16,Trabocca,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,paid_order,paid_order,1,1,no,paid one cleanup,fulfill order
b01-r05,2026-06-16,Falcon Coffees Europe,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r05,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r05,pilot_requested,pilot_request,0,0,yes,asked about pilot,quote pilot
`);

    const summary = summarizeOutreachResults(rows);

    expect(summary.totalRows).toBe(5);
    expect(summary.sentOrBeyond).toBe(5);
    expect(summary.replies).toBe(4);
    expect(summary.fileChecks).toBe(3);
    expect(summary.paidOrders).toBe(1);
    expect(summary.pilotRequests).toBe(1);
    expect(summary.replyRate).toBe("80.0%");
    expect(summary.fileCheckRate).toBe("60.0%");
    expect(summary.paidOrderRate).toBe("20.0%");
  });

  it("rejects invalid status values and private contact data", () => {
    const rows = parseOutreachResults(`route_id,date_sent,company_or_channel,tier,proof_url,file_check_url,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
bad-route,2026-06-16,Example Coffee,importer,https://traceready.online/proof/,https://traceready.online/,maybe,none,0,0,no,alice@example.com,follow up
b01-r02,2026-06-16,Example Two,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,sent,none,zero,0,no,https://www.linkedin.com/in/example-person,follow up
`);

    const errors = validateOutreachResults(rows);

    expect(errors).toContain("row 1 route_id must look like b01-r01");
    expect(errors).toContain("row 1 proof_url must be a tracked TraceReady proof URL");
    expect(errors).toContain("row 1 file_check_url must be a tracked TraceReady file-check URL");
    expect(errors).toContain("row 1 status must be one of not_sent, sent, no_reply, replied, file_checked, paid_order, pilot_requested, disqualified");
    expect(errors).toContain("row 1 contains an email address; keep committed results templates private-safe");
    expect(errors).toContain("row 2 file_check_count must be a non-negative integer");
    expect(errors).toContain("row 2 contains a personal-profile URL");
  });

  it("renders a concise funnel summary for a private working copy", () => {
    const rows = parseOutreachResults(`route_id,date_sent,company_or_channel,tier,proof_url,file_check_url,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,2026-06-16,Cafe Imports Europe,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,sent,none,0,0,no,,follow up
b01-r02,2026-06-16,Trabocca,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,paid_order,paid_order,1,1,no,paid one cleanup,fulfill order
`);
    const markdown = renderOutreachResultsSummary(summarizeOutreachResults(rows), {
      sourcePath: "private/outreach-results.csv",
    });

    expect(markdown).toContain("# TraceReady outreach results summary");
    expect(markdown).toContain("Source: `private/outreach-results.csv`");
    expect(markdown).toContain("| Sent or beyond | 2 |");
    expect(markdown).toContain("| Paid cleanup orders | 1 |");
    expect(markdown).toContain("Next decision");
  });

  it("keeps the committed response template private-safe and parseable", () => {
    const csv = fs.readFileSync("docs/proof-led-outreach-results-template.csv", "utf8");
    const rows = parseOutreachResults(csv);

    expect(validateOutreachResults(rows)).toEqual([]);
  });
});
