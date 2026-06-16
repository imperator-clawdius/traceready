import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";
import { renderOutreachPacket, validateRenderedOutreachPacket } from "./render-outreach-pack.mjs";

describe("proof-led outreach send packet renderer", () => {
  it("renders copy-pasteable messages for association and importer rows", () => {
    const rows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents the European coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r02,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
`);
    const markdown = renderOutreachPacket(rows, {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      title: "Fixture packet",
    });

    expect(markdown).toContain("# Fixture packet");
    expect(markdown).toContain("Generated from `docs/proof-led-outreach-batch-01.csv`");
    expect(markdown).toContain("Messy public file in");
    expect(markdown).toContain("Exact issue counts out");
    expect(markdown).toContain("Cleaned pack boundary");
    expect(markdown).toContain("## 1. European Coffee Federation");
    expect(markdown).toContain("Subject: Free EUDR file-readiness example for coffee members");
    expect(markdown).toContain("Is there a member education channel where this would be useful?");
    expect(markdown).toContain("## 2. Cafe Imports Europe");
    expect(markdown).toContain("- Route ID: b01-r02");
    expect(markdown).toContain("Subject: Row-level check for messy EUDR farm files");
    expect(markdown).toContain("Messy public file in: a public Colombian cocoa dataset");
    expect(markdown).toContain("Exact issue counts out: 46,134 point-only plots over 4 hectares");
    expect(markdown).toContain("Cleaned pack boundary: TraceReady did not invent missing plot IDs");
    expect(markdown).toContain("You can run one file in the browser first");
    expect(markdown).toContain("Documented pilot request:");
    expect(markdown).toContain(
      "https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
    );
    expect(markdown).toContain(
      "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
    );
    expect(markdown).toContain(
      "https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
    );
    expect(markdown).toContain(
      "https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02",
    );
    expect(markdown).toContain("57,658");
    expect(markdown).toContain("46,134");
    expect(validateRenderedOutreachPacket(markdown, rows)).toEqual([]);
  });

  it("rejects rendered packets that lose proof numbers, source URLs, or privacy guardrails", () => {
    const rows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
`);

    const errors = validateRenderedOutreachPacket(
      "Hi alice@example.com, buy my tool. https://www.linkedin.com/in/example-person",
      rows,
    );

    expect(errors).toContain("packet must include 57,658 public-audit proof number");
    expect(errors).toContain("packet must include 46,134 public-audit proof number");
    expect(errors).toContain("packet must include messy-file-in proof framing");
    expect(errors).toContain("packet must include exact-issues-out proof framing");
    expect(errors).toContain("packet must include cleaned-pack-boundary proof framing");
    expect(errors).toContain("packet must include tracked proof URL for Cafe Imports Europe");
    expect(errors).toContain("packet must include tracked field-note URL for Cafe Imports Europe");
    expect(errors).toContain("packet must include tracked file-check URL for Cafe Imports Europe");
    expect(errors).toContain("packet must include tracked documented-pilot URL for Cafe Imports Europe");
    expect(errors).toContain("packet must include source URL for Cafe Imports Europe");
    expect(errors).toContain("packet contains an email address; keep committed send packet company-level");
    expect(errors).toContain("packet contains a personal-profile URL");
  });

  it("keeps the committed send packet aligned with the committed batch", () => {
    const csv = fs.readFileSync("docs/proof-led-outreach-batch-01.csv", "utf8");
    const markdown = fs.readFileSync("docs/proof-led-outreach-send-pack-01.md", "utf8");
    const rows = parseOutreachLedger(csv);

    expect(validateRenderedOutreachPacket(markdown, rows)).toEqual([]);
  });
});
