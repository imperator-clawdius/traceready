import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateReplyCaptureChallenge,
  parseReplyCaptureChallengeVerificationArgs,
  renderReplyCaptureChallengeReport,
  verifyReplyCaptureChallengeFile,
} from "./verify-reply-capture-challenge.mjs";

const VALID_CHALLENGE = {
  contactEmail: "founder@traceready.online",
  createdAt: "2026-06-17T03:00:00.000Z",
  challengeToken: "trc-test-1234",
  subject: "TraceReady reply-capture test trc-test-1234",
  body: [
    "TraceReady reply-capture test for founder@traceready.online.",
    "Challenge token: trc-test-1234",
    "If this arrives in the controlled inbox, record private evidence with the received timestamp and this token.",
  ].join("\n"),
};

describe("reply-capture challenge verifier", () => {
  it("passes a complete challenge and renders the exact email to send", () => {
    const result = evaluateReplyCaptureChallenge(VALID_CHALLENGE, {
      contactEmail: "founder@traceready.online",
    });
    const report = renderReplyCaptureChallengeReport(result, {
      challengePath: "private/reply-capture-challenge.json",
      evidencePath: "private/reply-capture-evidence.json",
    });

    expect(result.ready).toBe(true);
    expect(report).toContain(
      "REPLY_CAPTURE_CHALLENGE=pass contact=founder@traceready.online token=trc-test-1234 path=private/reply-capture-challenge.json",
    );
    expect(report).toContain('REPLY_CAPTURE_CHALLENGE_SUBJECT="TraceReady reply-capture test trc-test-1234"');
    expect(report).toContain("REPLY_CAPTURE_CHALLENGE_BODY_START");
    expect(report).toContain("Challenge token: trc-test-1234");
    expect(report).toContain("REPLY_CAPTURE_CHALLENGE_BODY_END");
    expect(report).toContain(
      "npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --received-at <received-at-iso> --challenge private/reply-capture-challenge.json --confirm-controlled-inbox",
    );
  });

  it("rejects a challenge whose subject and body do not carry the token", () => {
    const result = evaluateReplyCaptureChallenge(
      {
        ...VALID_CHALLENGE,
        subject: "TraceReady reply-capture test wrong-token",
        body: "TraceReady reply-capture test for founder@traceready.online.",
      },
      { contactEmail: "founder@traceready.online" },
    );

    expect(result.ready).toBe(false);
    expect(result.errors).toContain("subject must include challengeToken");
    expect(result.errors).toContain("body must include challengeToken");
  });

  it("loads and verifies a challenge file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-challenge-verify-"));
    const challengePath = path.join(tempDir, "reply-capture-challenge.json");
    await fs.writeFile(challengePath, `${JSON.stringify(VALID_CHALLENGE, null, 2)}\n`, "utf8");

    const result = await verifyReplyCaptureChallengeFile({
      challengePath,
      contactEmail: "founder@traceready.online",
    });

    expect(result.ready).toBe(true);
    expect(result.challenge.challengeToken).toBe("trc-test-1234");
  });

  it("parses the challenge verification command", () => {
    expect(
      parseReplyCaptureChallengeVerificationArgs([
        "--challenge",
        "private/reply-capture-challenge.json",
        "--evidence-output",
        "private/reply-capture-evidence.json",
        "--contact",
        "founder@traceready.online",
      ]),
    ).toEqual({
      challengePath: "private/reply-capture-challenge.json",
      evidencePath: "private/reply-capture-evidence.json",
      contactEmail: "founder@traceready.online",
    });
  });

  it("exposes the challenge verifier as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["verify:reply-capture-challenge"]).toBe(
      "node scripts/verify-reply-capture-challenge.mjs",
    );
  });
});
