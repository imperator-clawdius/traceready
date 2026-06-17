import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

async function readRequired(relativePath) {
  try {
    return await fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
  } catch {
    return "";
  }
}

describe("documented pilot evidence template", () => {
  it("ships a safe public template and operator doc without customer proof fabrication", async () => {
    const publicTemplate = await readRequired("public/traceready-documented-pilot-template.txt");
    const operatorTemplate = await readRequired("docs/documented-pilot-evidence-template.md");
    const combined = `${publicTemplate}\n${operatorTemplate}`;

    expect(publicTemplate).toContain("TraceReady documented pilot evidence capture template");
    expect(publicTemplate).toContain("Publish only with explicit written approval");
    expect(publicTemplate).toContain("Do not publish company names, supplier names, buyer names, source rows, or farm coordinates");
    expect(publicTemplate).toContain("Before cleanup");
    expect(publicTemplate).toContain("After cleanup");
    expect(publicTemplate).toContain("Quote permission");
    expect(publicTemplate).toContain("Customer approval");
    expect(operatorTemplate).toContain("Use this only after a real file owner has asked for a documented pilot");
    expect(operatorTemplate).toContain("Private by default");
    expect(operatorTemplate).toContain("No approved quote yet");
    expect(combined).not.toContain("Example Customer");
    expect(combined).not.toContain("buyer accepted the pack");
  });
});
