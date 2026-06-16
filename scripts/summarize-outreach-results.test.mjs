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
    const rows = parseOutreachResults(`date_sent,company_or_channel,tier,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
2026-06-16,Cafe Imports Europe,importer,sent,none,0,0,no,,follow up
2026-06-16,European Coffee Federation,association,replied,referral,0,0,no,shared member channel,follow referral
2026-06-16,Nordic Approach,importer,file_checked,file_check,2,0,no,ran browser-side check,ask for cleanup
2026-06-16,Trabocca,importer,paid_order,paid_order,1,1,no,paid one cleanup,fulfill order
2026-06-16,Falcon Coffees Europe,importer,pilot_requested,pilot_request,0,0,yes,asked about pilot,quote pilot
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
    const rows = parseOutreachResults(`date_sent,company_or_channel,tier,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
2026-06-16,Example Coffee,importer,maybe,none,0,0,no,alice@example.com,follow up
2026-06-16,Example Two,importer,sent,none,zero,0,no,https://www.linkedin.com/in/example-person,follow up
`);

    const errors = validateOutreachResults(rows);

    expect(errors).toContain("row 1 status must be one of not_sent, sent, no_reply, replied, file_checked, paid_order, pilot_requested, disqualified");
    expect(errors).toContain("row 1 contains an email address; keep committed results templates private-safe");
    expect(errors).toContain("row 2 file_check_count must be a non-negative integer");
    expect(errors).toContain("row 2 contains a personal-profile URL");
  });

  it("renders a concise funnel summary for a private working copy", () => {
    const rows = parseOutreachResults(`date_sent,company_or_channel,tier,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
2026-06-16,Cafe Imports Europe,importer,sent,none,0,0,no,,follow up
2026-06-16,Trabocca,importer,paid_order,paid_order,1,1,no,paid one cleanup,fulfill order
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
