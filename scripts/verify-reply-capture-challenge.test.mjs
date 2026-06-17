import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateReplyCaptureChallenge,
  parseReplyCaptureChallengeVerificationArgs,
  renderReplyCaptureChallengeEmailDraft,
  renderReplyCaptureChallengeHandoff,
  renderReplyCaptureChallengeReport,
  verifyReplyCaptureChallengeFile,
  writeReplyCaptureChallengeEmailDraft,
  writeReplyCaptureChallengeHandoff,
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
      "npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --from-eml private/reply-capture-received.eml --challenge private/reply-capture-challenge.json --confirm-controlled-inbox",
    );
  });

  it("renders a durable reply-capture handoff without marking evidence complete", () => {
    const result = evaluateReplyCaptureChallenge(VALID_CHALLENGE, {
      contactEmail: "founder@traceready.online",
    });
    const markdown = renderReplyCaptureChallengeHandoff(result, {
      challengePath: "private/reply-capture-challenge.json",
      evidencePath: "private/reply-capture-evidence.json",
    });

    expect(markdown).toContain("# TraceReady reply-capture handoff");
    expect(markdown).toContain("Status: challenge verified; inbox receipt not yet proven.");
    expect(markdown).toContain("To: `founder@traceready.online`");
    expect(markdown).toContain("Subject: `TraceReady reply-capture test trc-test-1234`");
    expect(markdown).toContain("Challenge token: trc-test-1234");
    expect(markdown).toContain("Send this from a separate mailbox, not from the forwarding destination.");
    expect(markdown).toContain(
      "[Open mail draft](mailto:founder%40traceready.online?subject=TraceReady%20reply-capture%20test%20trc-test-1234&body=TraceReady%20reply-capture%20test%20for%20founder%40traceready.online.%0AChallenge%20token%3A%20trc-test-1234%0AIf%20this%20arrives%20in%20the%20controlled%20inbox%2C%20record%20private%20evidence%20with%20the%20received%20timestamp%20and%20this%20token.)",
    );
    expect(markdown).toContain("Optional local draft: `private/reply-capture-email.eml`");
    expect(markdown).toContain(
      "The saved `.eml` must include the original `Date` and `Subject` headers plus the message body carrying the challenge token.",
    );
    expect(markdown).toContain(
      "npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --from-eml private/reply-capture-received.eml --challenge private/reply-capture-challenge.json --confirm-controlled-inbox",
    );
    expect(markdown).toContain(
      "npm run verify:outreach-email -- --reply-capture-evidence private/reply-capture-evidence.json --reply-capture-challenge private/reply-capture-challenge.json",
    );
    expect(markdown).toContain("npm run finalize:reply-capture");
    expect(markdown).not.toContain("receivedInControlledInbox");
  });

  it("renders an unsent email draft for the verified challenge", () => {
    const result = evaluateReplyCaptureChallenge(VALID_CHALLENGE, {
      contactEmail: "founder@traceready.online",
    });
    const draft = renderReplyCaptureChallengeEmailDraft(result);

    expect(draft).toContain("X-Unsent: 1");
    expect(draft).toContain("To: founder@traceready.online");
    expect(draft).toContain("Subject: TraceReady reply-capture test trc-test-1234");
    expect(draft).toContain("Content-Type: text/plain; charset=utf-8");
    expect(draft).toContain("Challenge token: trc-test-1234");
    expect(draft).not.toContain("receivedInControlledInbox");
  });

  it("writes a reply-capture handoff file for the verified challenge", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-handoff-"));
    const handoffPath = path.join(tempDir, "reply-capture-handoff.md");
    const result = evaluateReplyCaptureChallenge(VALID_CHALLENGE, {
      contactEmail: "founder@traceready.online",
    });

    await writeReplyCaptureChallengeHandoff(result, {
      challengePath: "private/reply-capture-challenge.json",
      evidencePath: "private/reply-capture-evidence.json",
      handoffPath,
    });

    const markdown = await fs.readFile(handoffPath, "utf8");
    expect(markdown).toContain("# TraceReady reply-capture handoff");
    expect(markdown).toContain("Subject: `TraceReady reply-capture test trc-test-1234`");
  });

  it("writes an unsent email draft file for the verified challenge", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-reply-draft-"));
    const emailDraftPath = path.join(tempDir, "reply-capture-email.eml");
    const result = evaluateReplyCaptureChallenge(VALID_CHALLENGE, {
      contactEmail: "founder@traceready.online",
    });

    await writeReplyCaptureChallengeEmailDraft(result, { emailDraftPath });

    const draft = await fs.readFile(emailDraftPath, "utf8");
    expect(draft).toContain("X-Unsent: 1");
    expect(draft).toContain("Subject: TraceReady reply-capture test trc-test-1234");
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
        "--handoff-output",
        "private/reply-capture-handoff.md",
        "--email-draft-output",
        "private/reply-capture-email.eml",
      ]),
    ).toEqual({
      challengePath: "private/reply-capture-challenge.json",
      evidencePath: "private/reply-capture-evidence.json",
      contactEmail: "founder@traceready.online",
      handoffPath: "private/reply-capture-handoff.md",
      emailDraftPath: "private/reply-capture-email.eml",
    });
  });

  it("exposes the challenge verifier as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["verify:reply-capture-challenge"]).toBe(
      "node scripts/verify-reply-capture-challenge.mjs",
    );
  });
});
