import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  PUBLIC_PILOT_PACK_DIR,
  PUBLIC_PILOT_PACK_ZIP,
  writePublicPilotPack,
} from "./render-public-pilot-pack.mjs";
import {
  renderPublicPilotPackVerification,
  verifyPublicPilotPack,
} from "./verify-public-pilot-pack.mjs";

describe("public pilot pack verifier", () => {
  it("passes when the public folder and downloadable ZIP match the checksum manifest", async () => {
    const publicDir = await makePublicPilotPack();

    const result = await verifyPublicPilotPack({ publicDir });
    const report = renderPublicPilotPackVerification(result);

    expect(result.ready).toBe(true);
    expect(result.errors).toEqual([]);
    expect(report).toContain("PUBLIC_PILOT_PACK=pass");
    expect(report).toContain("artifacts=8");
    expect(report).toContain("zip_entries=9");
  });

  it("fails when a committed artifact drifts from the manifest", async () => {
    const publicDir = await makePublicPilotPack();
    const buyerSummaryPath = path.join(
      publicDir,
      PUBLIC_PILOT_PACK_DIR,
      "public-cocoa-pilot-buyer-summary.txt",
    );
    await fs.appendFile(buyerSummaryPath, "\nUnreviewed extra buyer claim.\n");

    const result = await verifyPublicPilotPack({ publicDir });

    expect(result.ready).toBe(false);
    expect(result.errors).toContain(
      "public-cocoa-pilot-buyer-summary.txt byte size does not match manifest",
    );
    expect(result.errors).toContain("public-cocoa-pilot-buyer-summary.txt sha256 does not match manifest");
  });

  it("fails when the downloadable ZIP contains files outside the manifest", async () => {
    const publicDir = await makePublicPilotPack();
    const zipPath = path.join(publicDir, PUBLIC_PILOT_PACK_ZIP);
    const zip = await JSZip.loadAsync(await fs.readFile(zipPath));
    zip.file("raw-source.csv", "lat,lon\n4.464943638685195,-72.98475870808237\n");
    await fs.writeFile(zipPath, await zip.generateAsync({ type: "nodebuffer" }));

    const result = await verifyPublicPilotPack({ publicDir });

    expect(result.ready).toBe(false);
    expect(result.errors).toContain("zip contains unexpected file: raw-source.csv");
  });

  it("fails when a derived public artifact leaks coordinate-looking values", async () => {
    const publicDir = await makePublicPilotPack();
    const reportPath = path.join(
      publicDir,
      PUBLIC_PILOT_PACK_DIR,
      "public-cocoa-pilot-readiness-report.txt",
    );
    await fs.appendFile(reportPath, "\nRaw sample: 4.464943638685195,-72.98475870808237\n");

    const result = await verifyPublicPilotPack({ publicDir });

    expect(result.ready).toBe(false);
    expect(result.errors).toContain(
      "public-cocoa-pilot-readiness-report.txt contains coordinate-looking value: 4.464943638685195",
    );
    expect(result.errors).toContain(
      "public-cocoa-pilot-readiness-report.txt contains coordinate-looking value: -72.98475870808237",
    );
  });

  it("is part of the main check gate", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["verify:public-pilot-pack"]).toBe("node scripts/verify-public-pilot-pack.mjs");
    expect(packageJson.scripts.check).toContain("npm run verify:public-pilot-pack");
  });
});

async function makePublicPilotPack() {
  const publicDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-public-pilot-"));
  await writePublicPilotPack({ publicDir });
  return publicDir;
}
