import { describe, expect, it } from "vitest";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import {
  buildOutreachActionQueue,
  parseNextActionArgs,
  renderOutreachActionQueue,
} from "./next-outreach-actions.mjs";

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,,European Coffee Federation,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r02,2026-06-16,EUDR Coffee / German Coffee Association,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,sent,none,1,0,0,no,sent via public form,follow up in 4 business days
b01-r03,2026-06-18,Deutscher Kaffeeverband,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,sent,none,0,0,0,no,sent via public form,follow up in 4 business days
b01-r04,2026-06-16,Specialty Coffee Association,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,file_checked,file_check,2,1,0,no,route-stamped buyer summary received,ask whether they want the cleaned pack
b01-r05,,Global Coffee Platform,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r05,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r05,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r05,not_sent,none,0,0,0,no,,send first message from proof-led packet
b01-r06,,Cafe Imports Europe,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,not_sent,none,0,0,0,no,,send first message from proof-led packet
`;

describe("next outreach actions", () => {
  it("builds send, follow-up, and opportunity queues from a results ledger", () => {
    const rows = parseOutreachResults(RESULTS_CSV);
    const queue = buildOutreachActionQueue(rows, {
      sendLimit: 1,
      today: "2026-06-20",
      followUpAfterDays: 4,
    });

    expect(queue.sendRows.map((row) => row.route_id)).toEqual(["b01-r01"]);
    expect(queue.followUpRows.map((row) => row.route_id)).toEqual(["b01-r02"]);
    expect(queue.opportunityRows.map((row) => row.route_id)).toEqual(["b01-r04"]);
    expect(queue.summary).toEqual({
      totalRows: 6,
      sendRemaining: 3,
      sendShown: 1,
      followUpsDue: 1,
      activeOpportunities: 1,
    });
  });

  it("can focus the first-send queue on a direct buyer tier", () => {
    const rows = parseOutreachResults(RESULTS_CSV);
    const queue = buildOutreachActionQueue(rows, {
      sendLimit: 2,
      today: "2026-06-20",
      followUpAfterDays: 4,
      sendTier: "importer",
    });
    const markdown = renderOutreachActionQueue(queue, {
      resultsPath: "private/outreach-results.csv",
      today: "2026-06-20",
    });

    expect(queue.sendRows.map((row) => row.route_id)).toEqual(["b01-r06"]);
    expect(queue.summary).toEqual({
      totalRows: 6,
      sendRemaining: 1,
      sendShown: 1,
      followUpsDue: 1,
      activeOpportunities: 1,
      sendTier: "importer",
    });
    expect(markdown).toContain("Send tier filter: importer");
    expect(markdown).toContain("b01-r06 - Cafe Imports Europe");
    expect(markdown).not.toContain("b01-r01 - European Coffee Federation");
  });

  it("renders a copy-pasteable action queue with update commands", () => {
    const rows = parseOutreachResults(RESULTS_CSV);
    const queue = buildOutreachActionQueue(rows, {
      sendLimit: 1,
      today: "2026-06-20",
      followUpAfterDays: 4,
    });
    const markdown = renderOutreachActionQueue(queue, {
      resultsPath: "private/outreach-results.csv",
      today: "2026-06-20",
    });

    expect(markdown).toContain("# TraceReady next outreach actions");
    expect(markdown).toContain("Source: `private/outreach-results.csv`");
    expect(markdown).toContain("## Send Next");
    expect(markdown).toContain("b01-r01 - European Coffee Federation");
    expect(markdown).toContain(
      "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
    expect(markdown).toContain(
      "npm run update:outreach-result -- --results private/outreach-results.csv --route b01-r01 --date-sent 2026-06-20 --status sent --response-type none",
    );
    expect(markdown).toContain('--notes "sent via public route"');
    expect(markdown).not.toContain("--reply-notes");
    expect(markdown).toContain("## Follow Up Due");
    expect(markdown).toContain("b01-r02 - EUDR Coffee / German Coffee Association");
    expect(markdown).toContain("sent 4 days ago");
    expect(markdown).toContain("## Active Opportunities");
    expect(markdown).toContain("b01-r04 - Specialty Coffee Association");
    expect(markdown).toContain("file_checked");
    expect(markdown).toContain("Field-note clicks: 2");
  });

  it("parses CLI flags for private action queue generation", () => {
    expect(
      parseNextActionArgs([
        "--results",
        "private/outreach-results.csv",
        "--today",
        "2026-06-20",
        "--send-limit",
        "6",
        "--follow-up-after-days",
        "5",
        "--send-tier",
        "importer",
      ]),
    ).toEqual({
      resultsPath: "private/outreach-results.csv",
      today: "2026-06-20",
      sendLimit: 6,
      followUpAfterDays: 5,
      sendTier: "importer",
    });
  });

  it("renders public initialized ledger previews with private-file update commands", () => {
    const rows = parseOutreachResults(RESULTS_CSV);
    const queue = buildOutreachActionQueue(rows, {
      sendLimit: 1,
      today: "2026-06-20",
      followUpAfterDays: 4,
    });
    const markdown = renderOutreachActionQueue(queue, {
      resultsPath: "docs/proof-led-outreach-results-batch-01.csv",
      today: "2026-06-20",
    });

    expect(markdown).toContain("Public initialized ledger preview");
    expect(markdown).toContain(
      "Copy `docs/proof-led-outreach-results-batch-01.csv` to a private results file before updating rows.",
    );
    expect(markdown).toContain("--results path/to/private-results.csv --route b01-r01");
    expect(markdown).not.toContain("--results docs/proof-led-outreach-results-batch-01.csv --route b01-r01");
  });
});
