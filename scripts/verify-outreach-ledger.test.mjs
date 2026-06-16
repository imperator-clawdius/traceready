import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

describe("proof-led outreach ledger verifier", () => {
  it("accepts company-level proof-led outreach rows", () => {
    const rows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,importer,Cafe Imports Europe,green coffee importer,Handles green coffee buyer relationships,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Run one browser-side file check,not_started,Send first message
2,b01-r02,association,European Coffee Federation,coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,association,"Lead with 57,658-row public audit and member education angle",Ask for member education route,not_started,Send first message
`);

    expect(validateOutreachLedger(rows, { expectedRows: 2 })).toEqual([]);
  });

  it("rejects personal contact data and non-proof-led rows", () => {
    const rows = parseOutreachLedger(`priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b01-r99,importer,Example Coffee,green coffee importer,Example fit,person email,alice@example.com,https://traceready.online/proof/,https://traceready.online/field-notes/eudr-file-errors/,https://traceready.online/,https://traceready.online/pilot-proof/,importer,Generic SaaS pitch,Buy now,not_started,Send first message
2,b01-r02,importer,Example Two,green coffee importer,Example fit,personal LinkedIn,https://www.linkedin.com/in/example-person,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r99,importer,"Lead with 57,658-row public audit",Run one file,contacted,Follow up
`);

    const errors = validateOutreachLedger(rows, { expectedRows: 2 });

    expect(errors).toContain("row 1 route_id must be b01-r01");
    expect(errors).toContain("row 1 proof_url must be tracked TraceReady proof URL for b01-r01");
    expect(errors).toContain("row 1 field_note_url must be tracked TraceReady field-note URL for b01-r01");
    expect(errors).toContain("row 1 file_check_url must be tracked TraceReady file-check URL for b01-r01");
    expect(errors).toContain("row 1 pilot_proof_url must be tracked TraceReady documented-pilot URL for b01-r01");
    expect(errors).toContain("row 1 source_url must be an https URL");
    expect(errors).toContain("row 1 contains an email address; use company-level route URLs only");
    expect(errors).toContain("row 1 proof_hook must include the public audit numbers");
    expect(errors).toContain("row 2 proof_url must be tracked TraceReady proof URL for b01-r02");
    expect(errors).toContain("row 2 field_note_url must be tracked TraceReady field-note URL for b01-r02");
    expect(errors).toContain("row 2 pilot_proof_url must be tracked TraceReady documented-pilot URL for b01-r02");
    expect(errors).toContain("row 2 source_url must not be a personal-profile URL");
    expect(errors).toContain("row 2 status must be not_started in the committed batch");
  });

  it("keeps the committed batch company-level, sourced, and measurable", () => {
    const csv = fs.readFileSync("docs/proof-led-outreach-batch-01.csv", "utf8");
    const rows = parseOutreachLedger(csv);

    expect(validateOutreachLedger(rows, { expectedRows: 20 })).toEqual([]);
    expect(rows[0].route_id).toBe("b01-r01");
    expect(rows.at(-1).route_id).toBe("b01-r20");
    expect(rows[0].proof_url).toBe(
      "https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
    expect(rows[0].field_note_url).toBe(
      "https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
    expect(rows[0].file_check_url).toBe(
      "https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
    expect(rows[0].pilot_proof_url).toBe(
      "https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01",
    );
  });
});
