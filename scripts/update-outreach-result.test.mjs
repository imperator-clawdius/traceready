import { describe, expect, it } from "vitest";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import {
  assertSafeResultsPath,
  parseUpdateArgs,
  renderUpdatedOutreachResultsCsv,
  updateOutreachResult,
} from "./update-outreach-result.mjs";

const FIXTURE_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,,European Coffee Federation,association,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r06,,Cafe Imports Europe,importer,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

describe("outreach result updater", () => {
  it("updates one route in a private results ledger and preserves parseable columns", () => {
    const rows = parseOutreachResults(FIXTURE_CSV);
    const updated = updateOutreachResult(rows, "b01-r06", {
      date_sent: "2026-06-16",
      status: "file_checked",
      response_type: "file_check",
      field_note_click_count: "1",
      file_check_count: "1",
      paid_order_count: "0",
      pilot_requested: "no",
      reply_notes: "route-stamped buyer summary received",
      next_action: "ask whether they want the cleaned pack",
    });

    expect(updated[0].status).toBe("not_sent");
    expect(updated[1]).toMatchObject({
      route_id: "b01-r06",
      date_sent: "2026-06-16",
      company_or_channel: "Cafe Imports Europe",
      status: "file_checked",
      response_type: "file_check",
      field_note_click_count: "1",
      file_check_count: "1",
      paid_order_count: "0",
      pilot_requested: "no",
      reply_notes: "route-stamped buyer summary received",
      next_action: "ask whether they want the cleaned pack",
    });

    const csv = renderUpdatedOutreachResultsCsv(updated);
    const reparsed = parseOutreachResults(csv);
    expect(validateOutreachResults(reparsed)).toEqual([]);
    expect(csv).toContain(
      "route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status",
    );
  });

  it("parses CLI flags into a route update patch", () => {
    expect(
      parseUpdateArgs([
        "--results",
        "private/outreach-results.csv",
        "--route",
        "b01-r06",
        "--date-sent",
        "2026-06-16",
        "--status",
        "sent",
        "--visible-success",
        "--response-type",
        "none",
        "--field-note-clicks",
        "1",
        "--notes",
        "sent via company contact form",
        "--next-action",
        "follow up in 4 business days",
      ]),
    ).toEqual({
      resultsPath: "private/outreach-results.csv",
      routeId: "b01-r06",
      patch: {
        date_sent: "2026-06-16",
        status: "sent",
        response_type: "none",
        field_note_click_count: "1",
        reply_notes: "sent via company contact form; visible form success observed",
        next_action: "follow up in 4 business days",
      },
    });
  });

  it("rejects sent updates that do not include visible submission evidence", () => {
    const rows = parseOutreachResults(FIXTURE_CSV);

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        date_sent: "2026-06-16",
        status: "sent",
        response_type: "none",
        reply_notes: "sent manually",
        next_action: "follow up in 4 business days",
      }),
    ).toThrow("row b01-r06 status sent requires reply_notes to include visible form success observed");

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        date_sent: "2026-06-16",
        status: "sent",
        response_type: "none",
        reply_notes: "sent manually; visible form success observed",
        next_action: "follow up in 4 business days",
      }),
    ).toThrow("row b01-r06 status sent requires reply_notes to include submission evidence");

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        date_sent: "2026-06-16",
        status: "sent",
        response_type: "none",
        reply_notes:
          "sent manually; visible form success observed; submission evidence: submission-evidence-b01-r06.json",
        next_action: "follow up in 4 business days",
      }),
    ).not.toThrow();
  });

  it("rejects concrete traction statuses without matching count evidence", () => {
    const rows = parseOutreachResults(FIXTURE_CSV);

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        date_sent: "2026-06-16",
        status: "file_checked",
        response_type: "file_check",
        reply_notes: "asked for a file review",
      }),
    ).toThrow("row b01-r06 status file_checked requires file_check_count above 0");

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        date_sent: "2026-06-16",
        status: "paid_order",
        response_type: "paid_order",
        file_check_count: "1",
        reply_notes: "checkout completed",
      }),
    ).toThrow("row b01-r06 status paid_order requires paid_order_count above 0");
  });

  it("rejects unknown routes and private contact data before writing", () => {
    const rows = parseOutreachResults(FIXTURE_CSV);

    expect(() => updateOutreachResult(rows, "b01-r99", { status: "sent" })).toThrow(
      "route b01-r99 was not found in results ledger",
    );

    expect(() =>
      updateOutreachResult(rows, "b01-r06", {
        status: "replied",
        response_type: "question",
        reply_notes: "alice@example.com asked a question",
      }),
    ).toThrow("row 2 contains an email address; keep committed results templates private-safe");
  });

  it("refuses to update the committed public initialized ledger by default", () => {
    expect(() => assertSafeResultsPath("docs/proof-led-outreach-results-batch-01.csv")).toThrow(
      "refusing to update committed public results ledger",
    );
    expect(() => assertSafeResultsPath("private/outreach-results.csv")).not.toThrow();
  });
});
