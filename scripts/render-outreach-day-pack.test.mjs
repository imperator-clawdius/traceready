import { describe, expect, it } from "vitest";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import {
  parseOutreachDayPackArgs,
  renderOutreachDayPack,
  validateOutreachDayPackInputs,
} from "./render-outreach-day-pack.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents the European coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r02,association,EUDR Coffee / German Coffee Association,EU coffee association,Hosts EUDR coffee guidance,public website,https://eudr.coffee/en/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
3,b01-r03,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
4,b01-r04,overflow,Preferred by Nature,EUDR consultant,Works with responsible sourcing programs,public contact page,https://preferredbynature.org/contact,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer first-pass cleanup desk,not_started,Send overflow variant
`;

const RESULTS_CSV = `route_id,date_sent,company_or_channel,tier,proof_url,file_check_url,status,response_type,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action
b01-r01,,European Coffee Federation,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,not_sent,none,0,0,no,,send first message from proof-led packet
b01-r02,2026-06-16,EUDR Coffee / German Coffee Association,association,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,sent,none,0,0,no,sent via public form,follow up in 4 business days
b01-r03,,Cafe Imports Europe,importer,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,not_sent,none,0,0,no,,send first message from proof-led packet
b01-r04,2026-06-18,Preferred by Nature,overflow,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,file_checked,file_check,1,0,no,route-stamped buyer summary received,ask whether they want the cleaned pack
`;

describe("proof-led outreach day pack", () => {
  it("renders the exact first-message, follow-up, and opportunity copy needed today", () => {
    const batchRows = parseOutreachLedger(BATCH_CSV);
    const resultRows = parseOutreachResults(RESULTS_CSV);
    const markdown = renderOutreachDayPack(batchRows, resultRows, {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results.csv",
      today: "2026-06-20",
      sendLimit: 1,
      followUpAfterDays: 4,
    });

    expect(markdown).toContain("# TraceReady outreach day pack");
    expect(markdown).toContain("Batch: `docs/proof-led-outreach-batch-01.csv`");
    expect(markdown).toContain("Results: `private/outreach-results.csv`");
    expect(markdown).toContain("## Send Today");
    expect(markdown).toContain("### b01-r01 - European Coffee Federation");
    expect(markdown).toContain(
      "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
    expect(markdown).toContain("Subject: Free EUDR file-readiness example for coffee members");
    expect(markdown).toContain("Is there a member education channel where this would be useful?");
    expect(markdown).not.toContain("### b01-r03 - Cafe Imports Europe");
    expect(markdown).toContain(
      "npm run update:outreach-result -- --results private/outreach-results.csv --route b01-r01 --date-sent 2026-06-20 --status sent --response-type none",
    );
    expect(markdown).toContain("## Follow Up Today");
    expect(markdown).toContain("### b01-r02 - EUDR Coffee / German Coffee Association");
    expect(markdown).toContain("sent 4 days ago");
    expect(markdown).toContain("Subject: Re: EUDR file-readiness check");
    expect(markdown).toContain("If this is not the right route");
    expect(markdown).toContain("## Active Opportunities");
    expect(markdown).toContain("### b01-r04 - Preferred by Nature");
    expect(markdown).toContain("ask whether they want the cleaned pack");
    expect(markdown).not.toContain("sent via public form");
  });

  it("uses private placeholder update commands when rendering from the public initialized ledger", () => {
    const markdown = renderOutreachDayPack(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      resultsPath: "docs/proof-led-outreach-results-batch-01.csv",
      today: "2026-06-20",
      sendLimit: 1,
      followUpAfterDays: 4,
    });

    expect(markdown).toContain("Public initialized ledger preview");
    expect(markdown).toContain("--results path/to/private-results.csv --route b01-r01");
    expect(markdown).not.toContain("--results docs/proof-led-outreach-results-batch-01.csv --route b01-r01");
  });

  it("can render a send block focused on direct importer routes", () => {
    const markdown = renderOutreachDayPack(parseOutreachLedger(BATCH_CSV), parseOutreachResults(RESULTS_CSV), {
      resultsPath: "private/outreach-results.csv",
      today: "2026-06-20",
      sendLimit: 1,
      followUpAfterDays: 4,
      sendTier: "importer",
    });

    expect(markdown).toContain("Send tier filter: importer");
    expect(markdown).toContain("### b01-r03 - Cafe Imports Europe");
    expect(markdown).toContain("Subject: Row-level check for messy EUDR farm files");
    expect(markdown).not.toContain("### b01-r01 - European Coffee Federation");
  });

  it("rejects results rows that cannot be joined to committed batch copy", () => {
    const errors = validateOutreachDayPackInputs(parseOutreachLedger(BATCH_CSV), [
      {
        ...parseOutreachResults(RESULTS_CSV)[0],
        route_id: "b01-r20",
        company_or_channel: "Missing Route",
      },
    ]);

    expect(errors).toEqual(["result route b01-r20 is missing from the outreach batch ledger"]);
  });

  it("parses CLI flags for batch, private results, output, and queue tuning", () => {
    expect(
      parseOutreachDayPackArgs([
        "--batch",
        "docs/proof-led-outreach-batch-01.csv",
        "--results",
        "private/outreach-results.csv",
        "--output",
        "private/day-pack.md",
        "--today",
        "2026-06-20",
        "--send-limit",
        "3",
        "--follow-up-after-days",
        "5",
        "--send-tier",
        "importer",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results.csv",
      outputPath: "private/day-pack.md",
      today: "2026-06-20",
      sendLimit: 3,
      followUpAfterDays: 5,
      sendTier: "importer",
    });
  });
});
