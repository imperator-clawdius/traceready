import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("launch verifier route manifest", () => {
  it("checks the free issue-log triage route in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "FILE_TRIAGE_PAGE"');
    expect(script).toContain('path: "/file-triage/"');
    expect(script).toContain("Free issue-log triage");
    expect(script).toContain("Do not send raw farm coordinates first");
  });

  it("checks the public EUDR file-errors field note in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "FIELD_NOTE_EUDR_FILE_ERRORS_PAGE"');
    expect(script).toContain('path: "/field-notes/eudr-file-errors/"');
    expect(script).toContain("7 EUDR file errors that create buyer-review rework");
    expect(script).toContain("46,134 point-only plots over 4 hectares");
  });

  it("checks the public pilot evidence pack CTA in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "PUBLIC_COCOA_PILOT_CASE_PAGE"');
    expect(script).toContain('path: "/proof/public-cocoa-pilot/"');
    expect(script).toContain("Public cocoa pilot case");
    expect(script).toContain("Download evidence pack");
    expect(script).toContain("Download public pilot evidence pack");
    expect(script).toContain("/traceready-public-cocoa-pilot-pack.zip");
    expect(script).toContain("Messy public file in");
    expect(script).toContain("Exact issue counts out");
    expect(script).toContain("Cleaned pack boundary");
    expect(script).not.toContain("Format example pack");
  });

  it("checks the documented pilot route in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "PILOT_PROOF_PAGE"');
    expect(script).toContain('path: "/pilot-proof/"');
    expect(script).toContain("first anonymized case");
    expect(script).toContain("Email documented pilot request");
  });
});
