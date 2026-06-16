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
});
