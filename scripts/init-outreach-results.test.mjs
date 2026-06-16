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
    const batchRows = parseOutreachLedger(`priority,tier,company_or_channel,segment,why_it_fits,public_route,source_url,message_variant,proof_hook,ask,status,next_step
1,association,European Coffee Federation,EU coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
`);

    const resultRows = buildInitialOutreachResults(batchRows);
    const csv = renderInitialOutreachResultsCsv(batchRows);

    expect(resultRows).toEqual([
      {
        date_sent: "",
        company_or_channel: "European Coffee Federation",
        tier: "association",
        status: "not_sent",
        response_type: "none",
        file_check_count: "0",
        paid_order_count: "0",
        pilot_requested: "no",
        reply_notes: "",
        next_action: "send first message from proof-led packet",
      },
      {
        date_sent: "",
        company_or_channel: "Cafe Imports Europe",
        tier: "importer",
        status: "not_sent",
        response_type: "none",
        file_check_count: "0",
        paid_order_count: "0",
        pilot_requested: "no",
        reply_notes: "",
        next_action: "send first message from proof-led packet",
      },
    ]);
    expect(csv).toContain("date_sent,company_or_channel,tier,status,response_type");
    expect(csv).toContain("Cafe Imports Europe,importer,not_sent,none,0,0,no");
    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toEqual([]);
  });

  it("detects stale initialized result rows", () => {
    const batchRows = parseOutreachLedger(`priority,tier,company_or_channel,segment,why_it_fits,public_route,source_url,message_variant,proof_hook,ask,status,next_step
1,association,European Coffee Federation,EU coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
`);
    const resultRows = parseOutreachResults(`date_sent,company_or_channel,tier,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
,Wrong Company,association,not_sent,none,0,0,no,,send first message from proof-led packet
`);

    expect(validateInitialResultsAgainstBatch(resultRows, batchRows)).toContain(
      "row 1 company_or_channel must match batch: European Coffee Federation",
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
