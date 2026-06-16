import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import {
  buildInitialOutreachResults,
  renderInitialOutreachResultsCsv,
  validateInitialResultsAgainstBatch,
} from "./init-outreach-results.mjs";

describe("outreach results initializer", () => {
  it("builds not-sent result rows from target batch rows", () => {
    const batchRows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r02,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
`);

    const resultRows = buildInitialOutreachResults(batchRows);
    const csv = renderInitialOutreachResultsCsv(batchRows);

    expect(resultRows).toEqual([
      {
        route_id: "b01-r01",
        date_sent: "",
        company_or_channel: "European Coffee Federation",
        tier: "association",
        proof_url:
          "https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
        field_note_url:
          "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
        file_check_url:
          "https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
        status: "not_sent",
        response_type: "none",
        field_note_click_count: "0",
        file_check_count: "0",
        paid_order_count: "0",
        pilot_requested: "no",
        reply_notes: "",
        next_action: "send first message from proof-led packet",
      },
      {
        route_id: "b01-r02",
        date_sent: "",
        company_or_channel: "Cafe Imports Europe",
        tier: "importer",
        proof_url:
          "https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
        field_note_url:
          "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
        file_check_url:
          "https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
        status: "not_sent",
        response_type: "none",
        field_note_click_count: "0",
        file_check_count: "0",
        paid_order_count: "0",
        pilot_requested: "no",
        reply_notes: "",
        next_action: "send first message from proof-led packet",
      },
    ]);
    expect(csv).toContain("route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,status");
    expect(csv).toContain("b01-r02,,Cafe Imports Europe,importer,");
    expect(csv).toContain("not_sent,none,0,0,0,no");
    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toEqual([]);
  });

  it("detects stale initialized result rows", () => {
    const batchRows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
`);
    const resultRows = parseOutreachResults(`route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r99,,Wrong Company,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,not_sent,none,0,0,0,no,,send first message from proof-led packet
`);

    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toContain(
      "row 1 route_id must match batch: b01-r01",
    );
    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toContain(
      "row 1 company_or_channel must match batch: European Coffee Federation",
    );
    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toContain(
      "row 1 field_note_url must match batch route b01-r01",
    );
  });

  it("keeps the committed initialized result ledger aligned with the outreach batch", () => {
    const batchCsv = fs.readFileSync("docs/proof-led-outreach-batch-01.csv", "utf8");
    const resultsCsv = fs.readFileSync("docs/proof-led-outreach-results-batch-01.csv", "utf8");
    const batchRows = parseOutreachLedger(batchCsv);
    const resultRows = parseOutreachResults(resultsCsv);

    expect(validateOutreachResults(resultRows)).toEqual([]);
    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toEqual([]);
  });
});
