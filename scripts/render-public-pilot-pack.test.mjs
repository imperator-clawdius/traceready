import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  PUBLIC_COCOA_PILOT_AUDIT,
  PUBLIC_PILOT_PACK_ZIP,
  renderPublicPilotPackFiles,
  writePublicPilotPack,
} from "./render-public-pilot-pack.mjs";

describe("public pilot evidence pack renderer", () => {
  it("renders derived proof artifacts without raw coordinate redistribution", () => {
    const files = renderPublicPilotPackFiles();
    const combined = Object.values(files).join("\n");

    expect(files["README.txt"]).toContain("TraceReady public cocoa pilot evidence pack");
    expect(files["public-cocoa-pilot-readiness-report.txt"]).toContain("Status: Not buyer-ready");
    expect(files["public-cocoa-pilot-issue-summary.csv"]).toContain("point_only_over_4ha,46134");
    expect(files["public-cocoa-pilot-buyer-followups.txt"]).toContain("Provide stable plot or farm IDs");
    expect(files["public-cocoa-pilot-buyer-summary.txt"]).toContain("Buyer handoff summary");
    expect(files["public-cocoa-pilot-buyer-summary.txt"]).toContain("Decision: hold for source-owner repair");
    expect(files["public-cocoa-pilot-buyer-summary.txt"]).toContain("Cleaned pack outcome");
    expect(files["public-cocoa-pilot-audit.json"]).toContain('"readyRecords": 0');
    expect(combined).toContain("This is not a customer case");
    expect(combined).toContain("does not redistribute raw source rows");
    expect(combined).not.toContain("Latitude");
    expect(combined).not.toContain("Longitude");
    expect(combined).not.toContain("4.464943638685195");
    expect(combined).not.toContain("-72.98475870808237");
  });

  it("writes the public folder and downloadable ZIP from the same artifact set", async () => {
    const publicDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-public-pilot-"));
    const result = await writePublicPilotPack({ publicDir });
    const zipBuffer = await fs.readFile(path.join(publicDir, PUBLIC_PILOT_PACK_ZIP));
    const zip = await JSZip.loadAsync(zipBuffer);
    const zippedNames = Object.keys(zip.files).sort();

    expect(result.files).toContain("public-cocoa-pilot-issue-summary.csv");
    expect(result.files).toContain("public-cocoa-pilot-buyer-summary.txt");
    expect(zippedNames).toEqual(result.files.toSorted());
    expect(await fs.readFile(path.join(result.packDir, "public-cocoa-pilot-audit.json"), "utf8")).toContain(
      `"analyzedRecords": ${PUBLIC_COCOA_PILOT_AUDIT.analyzedRecords}`,
    );
  });
});
