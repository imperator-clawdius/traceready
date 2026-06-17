import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildReplyCaptureChallenge,
  parseReplyCaptureChallengeArgs,
  prepareReplyCaptureChallenge,
} from "./prepare-reply-capture-challenge.mjs";

describe("reply-capture challenge preparer", () => {
  it("builds a tokenized challenge email for the controlled inbox test", () => {
    const challenge = buildReplyCaptureChallenge({
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });

    expect(challenge).toEqual({
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      challengeToken: "trc-test-1234",
      subject: "TraceReady reply-capture test trc-test-1234",
      body: [
        "TraceReady reply-capture test for founder@traceready.online.",
        "Challenge token: trc-test-1234",
        "If this arrives in the controlled inbox, record private evidence with the received timestamp and this token.",
      ].join("\n"),
    });
  });

  it("writes a challenge file that can be used before recording evidence", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-challenge-"));
    const outputPath = path.join(tempDir, "reply-capture-challenge.json");

    const result = await prepareReplyCaptureChallenge({
      outputPath,
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });
    const written = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(result.outputPath).toBe(outputPath);
    expect(written.challengeToken).toBe("trc-test-1234");
    expect(written.subject).toBe("TraceReady reply-capture test trc-test-1234");
  });

  it("parses the repeatable private challenge command", () => {
    expect(
      parseReplyCaptureChallengeArgs([
        "--output",
        "private/reply-capture-challenge.json",
        "--contact",
        "founder@traceready.online",
        "--created-at",
        "2026-06-17T03:00:00.000Z",
        "--token",
        "trc-test-1234",
      ]),
    ).toEqual({
      outputPath: "private/reply-capture-challenge.json",
      contactEmail: "founder@traceready.online",
      createdAt: "2026-06-17T03:00:00.000Z",
      token: "trc-test-1234",
    });
  });

  it("exposes the challenge preparer as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["prepare:reply-capture"]).toBe("node scripts/prepare-reply-capture-challenge.mjs");
  });
});
