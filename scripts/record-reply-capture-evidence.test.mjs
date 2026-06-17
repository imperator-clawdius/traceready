import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateReplyCaptureEvidence, loadReplyCaptureEvidence } from "./verify-outreach-email.mjs";
import {
  buildReplyCaptureEvidence,
  parseReplyCaptureEvidenceArgs,
  recordReplyCaptureEvidence,
} from "./record-reply-capture-evidence.mjs";

describe("reply-capture evidence recorder", () => {
  it("requires explicit controlled-inbox confirmation before building evidence", () => {
    expect(() =>
      buildReplyCaptureEvidence({
        contactEmail: "founder@traceready.online",
        receivedAt: "2026-06-17T02:30:00.000Z",
      }),
    ).toThrow("controlled inbox confirmation is required");
  });

  it("writes verifier-compatible evidence after the alias test is confirmed", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-capture-"));
    const outputPath = path.join(tempDir, "reply-capture-evidence.json");

    const result = await recordReplyCaptureEvidence({
      outputPath,
      contactEmail: "founder@traceready.online",
      receivedAt: "2026-06-17T02:30:00.000Z",
      confirmedControlledInbox: true,
    });
    const evidence = await loadReplyCaptureEvidence(outputPath);
    const evaluation = evaluateReplyCaptureEvidence(evidence);

    expect(result.outputPath).toBe(outputPath);
    expect(evidence).toEqual({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T02:30:00.000Z",
    });
    expect(evaluation.ready).toBe(true);
  });

  it("parses the command used after a real inbox test arrives", () => {
    expect(
      parseReplyCaptureEvidenceArgs([
        "--output",
        "private/reply-capture-evidence.json",
        "--contact",
        "founder@traceready.online",
        "--received-at",
        "2026-06-17T02:30:00.000Z",
        "--confirm-controlled-inbox",
      ]),
    ).toEqual({
      outputPath: "private/reply-capture-evidence.json",
      contactEmail: "founder@traceready.online",
      receivedAt: "2026-06-17T02:30:00.000Z",
      confirmedControlledInbox: true,
    });
  });

  it("exposes the recorder as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["record:reply-capture"]).toBe("node scripts/record-reply-capture-evidence.mjs");
  });
});
