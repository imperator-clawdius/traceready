import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  parsePrepareOutreachWorkspaceArgs,
  prepareOutreachWorkspace,
} from "./prepare-outreach-workspace.mjs";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("prepare outreach workspace", () => {
  it("creates a private results ledger and day pack from the committed outreach artifacts", async () => {
    const tempDir = makeTempDir();
    const resultsPath = path.join(tempDir, "private", "outreach-results.csv");
    const dayPackPath = path.join(tempDir, "private", "outreach-day-pack.md");

    const result = await prepareOutreachWorkspace({
      resultsPath,
      dayPackPath,
      today: "2026-06-16",
      sendLimit: 1,
      followUpAfterDays: 4,
    });

    expect(result).toEqual({
      resultsCreated: true,
      resultsPath,
      dayPackPath,
      rows: 20,
      today: "2026-06-16",
      sendLimit: 1,
    });
    expect(fs.existsSync(resultsPath)).toBe(true);
    expect(fs.existsSync(dayPackPath)).toBe(true);
    expect(fs.readFileSync(resultsPath, "utf8")).toBe(
      fs.readFileSync("docs/proof-led-outreach-results-batch-01.csv", "utf8"),
    );

    const dayPack = fs.readFileSync(dayPackPath, "utf8");
    expect(dayPack).toContain("### b01-r01 - European Coffee Federation");
    expect(dayPack).toContain("Field note URL: https://traceready.online/field-notes/eudr-file-errors/");
    expect(dayPack).toContain("--results " + resultsPath);
  });

  it("reuses an existing private results ledger instead of overwriting live progress", async () => {
    const tempDir = makeTempDir();
    const resultsPath = path.join(tempDir, "private", "outreach-results.csv");
    const dayPackPath = path.join(tempDir, "private", "outreach-day-pack.md");
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    const existingCsv = fs
      .readFileSync("docs/proof-led-outreach-results-batch-01.csv", "utf8")
      .replace(",no,,send first message from proof-led packet", ",no,existing private note,send first message from proof-led packet");
    fs.writeFileSync(resultsPath, existingCsv, "utf8");

    const result = await prepareOutreachWorkspace({
      resultsPath,
      dayPackPath,
      today: "2026-06-16",
      sendLimit: 1,
    });

    expect(result.resultsCreated).toBe(false);
    expect(fs.readFileSync(resultsPath, "utf8")).toBe(existingCsv);
    expect(fs.existsSync(dayPackPath)).toBe(true);
  });

  it("parses CLI flags for private workspace preparation", () => {
    expect(
      parsePrepareOutreachWorkspaceArgs([
        "--results",
        "private/results.csv",
        "--day-pack",
        "private/day-pack.md",
        "--today",
        "2026-06-20",
        "--send-limit",
        "6",
        "--follow-up-after-days",
        "5",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      publicResultsPath: "docs/proof-led-outreach-results-batch-01.csv",
      resultsPath: "private/results.csv",
      dayPackPath: "private/day-pack.md",
      today: "2026-06-20",
      sendLimit: 6,
      followUpAfterDays: 5,
    });
  });

  it("keeps private outreach workspaces out of committed files", () => {
    expect(fs.readFileSync(".gitignore", "utf8")).toContain("/private/");
  });
});

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "traceready-outreach-"));
  tempDirs.push(dir);
  return dir;
}
