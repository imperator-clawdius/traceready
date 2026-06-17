import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateReplyCaptureEvidence, loadReplyCaptureEvidence } from "./verify-outreach-email.mjs";
import { buildReplyCaptureChallenge } from "./prepare-reply-capture-challenge.mjs";
import {
  buildReplyCaptureEvidence,
  buildReplyCaptureEvidenceFromEml,
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

  it("records the challenge token when the inbox test used a prepared challenge", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-capture-"));
    const outputPath = path.join(tempDir, "reply-capture-evidence.json");
    const challenge = buildReplyCaptureChallenge({
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });

    await recordReplyCaptureEvidence({
      outputPath,
      contactEmail: "founder@traceready.online",
      receivedAt: "2026-06-17T03:04:00.000Z",
      confirmedControlledInbox: true,
      challenge,
    });
    const evidence = await loadReplyCaptureEvidence(outputPath);
    const evaluation = evaluateReplyCaptureEvidence(evidence);

    expect(evidence).toMatchObject({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T03:04:00.000Z",
      challengeToken: "trc-test-1234",
      challengeCreatedAt: "2026-06-17T03:00:00.000Z",
      challengeSubject: "TraceReady reply-capture test trc-test-1234",
    });
    expect(evaluation.ready).toBe(true);
    expect(evaluation.detail).toContain("challenge=trc-test-1234");
  });

  it("records verifier-compatible evidence from a saved received eml", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-capture-"));
    const outputPath = path.join(tempDir, "reply-capture-evidence.json");
    const challenge = buildReplyCaptureChallenge({
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });
    const eml = [
      "From: sender@example.com",
      "To: founder@traceready.online",
      "Date: Wed, 17 Jun 2026 03:04:00 +0000",
      "Subject: TraceReady reply-capture test trc-test-1234",
      "",
      "TraceReady reply-capture test for founder@traceready.online.",
      "Challenge token: trc-test-1234",
      "",
    ].join("\r\n");

    const evidence = buildReplyCaptureEvidenceFromEml({
      contactEmail: "founder@traceready.online",
      eml,
      confirmedControlledInbox: true,
      challenge,
    });
    const result = await recordReplyCaptureEvidence({
      outputPath,
      contactEmail: "founder@traceready.online",
      eml,
      confirmedControlledInbox: true,
      challenge,
    });
    const savedEvidence = await loadReplyCaptureEvidence(outputPath);

    expect(evidence).toMatchObject({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T03:04:00.000Z",
      challengeToken: "trc-test-1234",
      challengeSubject: "TraceReady reply-capture test trc-test-1234",
    });
    expect(result.evidence).toEqual(evidence);
    expect(savedEvidence).toEqual(evidence);
    expect(evaluateReplyCaptureEvidence(savedEvidence, { expectedChallenge: challenge }).ready).toBe(true);
  });

  it("rejects a received subject that does not match the prepared challenge", () => {
    const challenge = buildReplyCaptureChallenge({
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });

    expect(() =>
      buildReplyCaptureEvidence({
        contactEmail: "founder@traceready.online",
        receivedAt: "2026-06-17T03:04:00.000Z",
        receivedSubject: "TraceReady reply-capture test wrong-token",
        confirmedControlledInbox: true,
        challenge,
      }),
    ).toThrow("received subject must match challenge subject");
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
        "--received-subject",
        "TraceReady reply-capture test trc-test-1234",
        "--challenge",
        "private/reply-capture-challenge.json",
        "--confirm-controlled-inbox",
      ]),
    ).toEqual({
      outputPath: "private/reply-capture-evidence.json",
      contactEmail: "founder@traceready.online",
      receivedAt: "2026-06-17T02:30:00.000Z",
      receivedSubject: "TraceReady reply-capture test trc-test-1234",
      challengePath: "private/reply-capture-challenge.json",
      confirmedControlledInbox: true,
    });
  });

  it("parses a saved eml path as the source for reply-capture evidence", () => {
    expect(
      parseReplyCaptureEvidenceArgs([
        "--output",
        "private/reply-capture-evidence.json",
        "--contact",
        "founder@traceready.online",
        "--from-eml",
        "private/reply-capture-received.eml",
        "--challenge",
        "private/reply-capture-challenge.json",
        "--confirm-controlled-inbox",
      ]),
    ).toEqual({
      outputPath: "private/reply-capture-evidence.json",
      contactEmail: "founder@traceready.online",
      emlPath: "private/reply-capture-received.eml",
      challengePath: "private/reply-capture-challenge.json",
      confirmedControlledInbox: true,
    });
  });

  it("exposes the recorder as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["record:reply-capture"]).toBe("node scripts/record-reply-capture-evidence.mjs");
  });
});
