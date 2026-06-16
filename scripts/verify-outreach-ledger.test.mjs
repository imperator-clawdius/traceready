import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

describe("proof-led outreach ledger verifier", () => {
  it("accepts company-level proof-led outreach rows", () => {
    const rows = parseOutreachLedger(`priority,tier,company_or_channel,segment,why_it_fits,public_route,source_url,message_variant,proof_hook,ask,status,next_step
1,importer,Cafe Imports Europe,green coffee importer,Handles green coffee buyer relationships,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Run one browser-side file check,not_started,Send first message
2,association,European Coffee Federation,coffee association,Represents EU coffee sector,public website,https://www.ecf-coffee.org/,association,"Lead with 57,658-row public audit and member education angle",Ask for member education route,not_started,Send first message
`);

    expect(validateOutreachLedger(rows, { expectedRows: 2 })).toEqual([]);
  });

  it("rejects personal contact data and non-proof-led rows", () => {
    const rows = parseOutreachLedger(`priority,tier,company_or_channel,segment,why_it_fits,public_route,source_url,message_variant,proof_hook,ask,status,next_step
1,importer,Example Coffee,green coffee importer,Example fit,person email,alice@example.com,importer,Generic SaaS pitch,Buy now,not_started,Send first message
2,importer,Example Two,green coffee importer,Example fit,personal LinkedIn,https://www.linkedin.com/in/example-person,importer,"Lead with 57,658-row public audit",Run one file,contacted,Follow up
`);

    const errors = validateOutreachLedger(rows, { expectedRows: 2 });

    expect(errors).toContain("row 1 source_url must be an https URL");
    expect(errors).toContain("row 1 contains an email address; use company-level route URLs only");
    expect(errors).toContain("row 1 proof_hook must include the public audit numbers");
    expect(errors).toContain("row 2 source_url must not be a personal-profile URL");
    expect(errors).toContain("row 2 status must be not_started in the committed batch");
  });

  it("keeps the committed batch company-level, sourced, and measurable", () => {
    const csv = fs.readFileSync("docs/proof-led-outreach-batch-01.csv", "utf8");
    const rows = parseOutreachLedger(csv);

    expect(validateOutreachLedger(rows, { expectedRows: 20 })).toEqual([]);
  });
});
