import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
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
    expect(files["public-cocoa-pilot-case-study.txt"]).toContain("Messy public file in");
    expect(files["public-cocoa-pilot-case-study.txt"]).toContain("Exact issues found");
    expect(files["public-cocoa-pilot-case-study.txt"]).toContain("Cleaned pack boundary");
    expect(files["public-cocoa-pilot-case-study.txt"]).toContain("What would make this a real customer case");
    expect(files["README.txt"]).toContain("public-cocoa-pilot-pack-manifest.json");
    expect(files["public-cocoa-pilot-reproducibility-manifest.txt"]).toContain("Reproducibility manifest");
    expect(files["public-cocoa-pilot-reproducibility-manifest.txt"]).toContain("Dataset URL: https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset");
    expect(files["public-cocoa-pilot-reproducibility-manifest.txt"]).toContain("TraceReady-supplied assumptions");
    expect(files["public-cocoa-pilot-reproducibility-manifest.txt"]).toContain("No raw source rows or farm coordinates are redistributed");
    expect(files["public-cocoa-pilot-audit.json"]).toContain('"readyRecords": 0');
    expect(files["public-cocoa-pilot-pack-manifest.json"]).toContain('"packType": "public-data-pilot"');
    expect(combined).toContain("This is not a customer case");
    expect(combined).toContain("does not redistribute raw source rows");
    expect(combined).not.toContain("Latitude");
    expect(combined).not.toContain("Longitude");
    expect(combined).not.toContain("4.464943638685195");
    expect(combined).not.toContain("-72.98475870808237");
  });

  it("renders a checksum manifest for every derived artifact in the pack", () => {
    const files = renderPublicPilotPackFiles();
    const manifest = JSON.parse(files["public-cocoa-pilot-pack-manifest.json"]);
    const expectedArtifactNames = Object.keys(files)
      .filter((filename) => filename !== "public-cocoa-pilot-pack-manifest.json")
      .toSorted();

    expect(manifest.packType).toBe("public-data-pilot");
    expect(manifest.dataset.title).toBe("Colombian-Cocoa-Dataset");
    expect(manifest.audit.recordsAnalyzed).toBe(PUBLIC_COCOA_PILOT_AUDIT.analyzedRecords);
    expect(manifest.boundary.noRawSourceRows).toBe(true);
    expect(manifest.boundary.noRawCoordinates).toBe(true);
    expect(manifest.artifacts.map((artifact) => artifact.filename).toSorted()).toEqual(expectedArtifactNames);

    const readmeArtifact = manifest.artifacts.find((artifact) => artifact.filename === "README.txt");
    expect(readmeArtifact).toMatchObject({
      bytes: Buffer.byteLength(files["README.txt"], "utf8"),
      sha256: sha256(files["README.txt"]),
    });
  });

  it("writes the public folder and downloadable ZIP from the same artifact set", async () => {
    const publicDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-public-pilot-"));
    const result = await writePublicPilotPack({ publicDir });
    const zipBuffer = await fs.readFile(path.join(publicDir, PUBLIC_PILOT_PACK_ZIP));
    const zip = await JSZip.loadAsync(zipBuffer);
    const zippedNames = Object.keys(zip.files).sort();

    expect(result.files).toContain("public-cocoa-pilot-issue-summary.csv");
    expect(result.files).toContain("public-cocoa-pilot-case-study.txt");
    expect(result.files).toContain("public-cocoa-pilot-buyer-summary.txt");
    expect(result.files).toContain("public-cocoa-pilot-reproducibility-manifest.txt");
    expect(result.files).toContain("public-cocoa-pilot-pack-manifest.json");
    expect(zippedNames).toEqual(result.files.toSorted());
    expect(await fs.readFile(path.join(result.packDir, "public-cocoa-pilot-audit.json"), "utf8")).toContain(
      `"analyzedRecords": ${PUBLIC_COCOA_PILOT_AUDIT.analyzedRecords}`,
    );
    const zippedManifest = JSON.parse(await zip.file("public-cocoa-pilot-pack-manifest.json").async("string"));
    expect(zippedManifest.artifacts.find((artifact) => artifact.filename === "public-cocoa-pilot-audit.json")).toMatchObject({
      sha256: sha256(await fs.readFile(path.join(result.packDir, "public-cocoa-pilot-audit.json"), "utf8")),
    });
  });
});

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
