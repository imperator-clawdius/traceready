import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  finalizeReplyCaptureGate,
  parseReplyCaptureGateArgs,
  renderReplyCaptureGateReport,
} from "./finalize-reply-capture-gate.mjs";

describe("reply-capture gate finalizer", () => {
  it("blocks safely when reply-capture evidence is still missing", async () => {
    const result = await finalizeReplyCaptureGate(
      {
        today: "2026-06-20",
        evidencePath: "private/reply-capture-evidence.json",
        challengePath: "private/reply-capture-challenge.json",
        handoffPath: "private/reply-capture-handoff.md",
      },
      {
        exists: async (filePath) => filePath === "private/reply-capture-challenge.json",
        loadChallenge: async () => ({
          challengeToken: "trc-test-1234",
          subject: "TraceReady reply-capture test trc-test-1234",
        }),
      },
    );
    const report = renderReplyCaptureGateReport(result);

    expect(result.ready).toBe(false);
    expect(result.reason).toBe("missing_reply_capture_evidence");
    expect(report).toContain("REPLY_CAPTURE_GATE=pending reason=missing_reply_capture_evidence");
    expect(report).toContain("send the email in private/reply-capture-handoff.md");
    expect(report).toContain("REPLY_CAPTURE_GATE_EML=private/reply-capture-received.eml");
    expect(report).toContain("REPLY_CAPTURE_GATE_SUBJECT=TraceReady reply-capture test trc-test-1234");
    expect(report).toContain("REPLY_CAPTURE_GATE_TOKEN=trc-test-1234");
    expect(report).toContain(
      "npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --from-eml private/reply-capture-received.eml --challenge private/reply-capture-challenge.json --confirm-controlled-inbox",
    );
  });

  it("refreshes scorecard and submit queue after verified reply capture evidence", async () => {
    const calls = [];
    const result = await finalizeReplyCaptureGate(
      {
        today: "2026-06-20",
        evidencePath: "private/reply-capture-evidence.json",
        challengePath: "private/reply-capture-challenge.json",
        scorecardPath: "private/traction-readiness-scorecard-2026-06-20.md",
        preflightQueuePath: "private/preflight-submit-queue.md",
      },
      {
        exists: async () => true,
        inspectEmail: async () => ({
          ready: false,
          replyCaptureReady: true,
          checks: [
            { label: "OUTREACH_EMAIL_MX", ready: true },
            { label: "OUTREACH_EMAIL_ALIAS_TEST", ready: true },
          ],
        }),
        runNodeScript: async (scriptPath, args) => {
          calls.push({ scriptPath, args });
          return { stdout: `${scriptPath} ok`, stderr: "" };
        },
      },
    );
    const report = renderReplyCaptureGateReport(result);

    expect(result.ready).toBe(true);
    expect(result.replyCaptureReady).toBe(true);
    expect(result.emailReady).toBe(false);
    expect(calls).toEqual([
      {
        scriptPath: "scripts/score-traction-readiness.mjs",
        args: [
          "--reply-capture-evidence",
          "private/reply-capture-evidence.json",
          "--reply-capture-challenge",
          "private/reply-capture-challenge.json",
          "--output",
          "private/traction-readiness-scorecard-2026-06-20.md",
          "--today",
          "2026-06-20",
        ],
      },
      {
        scriptPath: "scripts/preflight-outreach-submit.mjs",
        args: [
          "--all-ready",
          "--reply-capture-evidence",
          "private/reply-capture-evidence.json",
          "--reply-capture-challenge",
          "private/reply-capture-challenge.json",
          "--output-dir",
          "private",
          "--queue-output",
          "private/preflight-submit-queue.md",
          "--today",
          "2026-06-20",
        ],
      },
    ]);
    expect(report).toContain("REPLY_CAPTURE_GATE=pass reply_capture_ready=true email_ready=false");
    expect(report).toContain("scorecard=private/traction-readiness-scorecard-2026-06-20.md");
    expect(report).toContain("preflight_queue=private/preflight-submit-queue.md");
  });

  it("records a saved received eml before refreshing scorecard and submit queue", async () => {
    const calls = [];
    const recordCalls = [];
    const result = await finalizeReplyCaptureGate(
      {
        today: "2026-06-20",
        evidencePath: "private/reply-capture-evidence.json",
        challengePath: "private/reply-capture-challenge.json",
        emlPath: "private/reply-capture-received.eml",
        scorecardPath: "private/traction-readiness-scorecard-2026-06-20.md",
      },
      {
        exists: async (filePath) =>
          filePath === "private/reply-capture-challenge.json" ||
          filePath === "private/reply-capture-received.eml",
        loadChallenge: async () => ({
          contactEmail: "founder@traceready.online",
          createdAt: "2026-06-17T03:00:00.000Z",
          challengeToken: "trc-test-1234",
          subject: "TraceReady reply-capture test trc-test-1234",
        }),
        recordEvidence: async (options) => {
          recordCalls.push(options);
          return {
            outputPath: options.outputPath,
            evidence: {
              contactEmail: options.contactEmail,
              receivedInControlledInbox: true,
              receivedAt: "2026-06-17T03:04:00.000Z",
              challengeToken: "trc-test-1234",
              challengeCreatedAt: "2026-06-17T03:00:00.000Z",
              challengeSubject: "TraceReady reply-capture test trc-test-1234",
            },
          };
        },
        inspectEmail: async () => ({
          ready: false,
          replyCaptureReady: true,
          checks: [
            { label: "OUTREACH_EMAIL_MX", ready: true },
            { label: "OUTREACH_EMAIL_ALIAS_TEST", ready: true },
          ],
        }),
        runNodeScript: async (scriptPath, args) => {
          calls.push({ scriptPath, args });
          return { stdout: `${scriptPath} ok`, stderr: "" };
        },
      },
    );
    const report = renderReplyCaptureGateReport(result);

    expect(result.ready).toBe(true);
    expect(result.autoRecordedEvidence).toBe(true);
    expect(recordCalls).toEqual([
      {
        outputPath: "private/reply-capture-evidence.json",
        contactEmail: "founder@traceready.online",
        emlPath: "private/reply-capture-received.eml",
        challengePath: "private/reply-capture-challenge.json",
        confirmedControlledInbox: true,
      },
    ]);
    expect(calls.map((call) => call.scriptPath)).toEqual([
      "scripts/score-traction-readiness.mjs",
      "scripts/preflight-outreach-submit.mjs",
    ]);
    expect(report).toContain("REPLY_CAPTURE_GATE=pass reply_capture_ready=true email_ready=false");
    expect(report).toContain("REPLY_CAPTURE_GATE_AUTO_RECORDED=private/reply-capture-evidence.json");
  });

  it("parses the finalizer command defaults and overrides", () => {
    expect(
      parseReplyCaptureGateArgs([
        "--today",
        "2026-06-20",
        "--evidence",
        "private/custom-evidence.json",
        "--challenge",
        "private/custom-challenge.json",
        "--scorecard-output",
        "private/custom-scorecard.md",
        "--eml",
        "private/custom-received.eml",
        "--preflight-queue-output",
        "private/custom-queue.md",
      ]),
    ).toEqual({
      today: "2026-06-20",
      evidencePath: "private/custom-evidence.json",
      challengePath: "private/custom-challenge.json",
      handoffPath: "private/reply-capture-handoff.md",
      emlPath: "private/custom-received.eml",
      scorecardPath: "private/custom-scorecard.md",
      preflightOutputDir: "private",
      preflightQueuePath: "private/custom-queue.md",
    });
  });

  it("exposes the finalizer as an npm command", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["finalize:reply-capture"]).toBe(
      "node scripts/finalize-reply-capture-gate.mjs",
    );
  });
});
