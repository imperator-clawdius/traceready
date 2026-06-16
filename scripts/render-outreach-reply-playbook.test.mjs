import { describe, expect, it } from "vitest";
import {
  parseOutreachReplyPlaybookArgs,
  renderOutreachReplyPlaybook,
  validateOutreachReplyPlaybookInputs,
} from "./render-outreach-reply-playbook.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents the European coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r06,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
`;

describe("outreach reply playbook", () => {
  it("renders route-stamped objection replies and private-safe update commands", () => {
    const rows = parseOutreachLedger(BATCH_CSV);
    const markdown = renderOutreachReplyPlaybook(rows, {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results-batch-01.csv",
      routeId: "b01-r06",
    });

    expect(markdown).toContain("# TraceReady reply playbook");
    expect(markdown).toContain("Route: b01-r06 - Cafe Imports Europe");
    expect(markdown).toContain("Proof URL: https://traceready.online/proof/?utm_source=proof_led_batch_01");
    expect(markdown).toContain("Field note URL: https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01");
    expect(markdown).toContain("File check URL: https://traceready.online/?utm_source=proof_led_batch_01");
    expect(markdown).toContain("## Who are you?");
    expect(markdown).toContain("I am not asking you to trust credentials first");
    expect(markdown).toContain("## We cannot send coordinates");
    expect(markdown).toContain("Coordinates do not need to leave your machine for the first issue list");
    expect(markdown).toContain("/file-triage/?utm_source=proof_led_batch_01");
    expect(markdown).toContain("## We already use an EUDR platform");
    expect(markdown).toContain("TraceReady sits before the platform");
    expect(markdown).toContain("## Can you certify this?");
    expect(markdown).toContain("No. TraceReady is operational cleanup");
    expect(markdown).toContain("## Useful, we ran a file");
    expect(markdown).toContain("ask whether they want the cleaned pack");
    expect(markdown).toContain(
      "npm run update:outreach-result -- --results private/outreach-results-batch-01.csv --route b01-r06 --status replied --response-type question",
    );
    expect(markdown).toContain("--notes \"objection: cannot share coordinates\"");
    expect(markdown).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it("rejects a route ID that is not in the committed batch", () => {
    expect(validateOutreachReplyPlaybookInputs(parseOutreachLedger(BATCH_CSV), { routeId: "b01-r20" })).toEqual([
      "route b01-r20 is missing from the outreach batch",
    ]);
  });

  it("parses CLI flags for batch, results, route, and output", () => {
    expect(
      parseOutreachReplyPlaybookArgs([
        "--batch",
        "docs/proof-led-outreach-batch-01.csv",
        "--results",
        "private/outreach-results.csv",
        "--route",
        "b01-r06",
        "--output",
        "private/replies.md",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      resultsPath: "private/outreach-results.csv",
      routeId: "b01-r06",
      outputPath: "private/replies.md",
    });
  });
});
