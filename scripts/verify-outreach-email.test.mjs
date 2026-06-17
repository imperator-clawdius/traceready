import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  evaluateReplyCaptureEvidence,
  evaluateOutreachEmailDns,
  inspectOutreachEmailDns,
  parseOutreachEmailArgs,
  renderOutreachEmailReport,
} from "./verify-outreach-email.mjs";

const NAMECHEAP_MX = [
  { exchange: "eforward1.registrar-servers.com" },
  { exchange: "eforward2.registrar-servers.com" },
  { exchange: "eforward3.registrar-servers.com" },
  { exchange: "eforward4.registrar-servers.com" },
  { exchange: "eforward5.registrar-servers.com" },
];

describe("outreach email verifier", () => {
  it("passes only when forwarding MX, SPF, DMARC, and DKIM are present", () => {
    const report = evaluateOutreachEmailDns({
      aliasTested: true,
      mxRecords: NAMECHEAP_MX,
      apexTxtRecords: [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]],
      dmarcTxtRecords: [["v=DMARC1; p=none; rua=mailto:founder@traceready.online"]],
      dkimSelectors: ["default"],
      dkimTxtRecordSets: [[["v=DKIM1; k=rsa; p=abc123"]]],
    });

    expect(report.ready).toBe(true);
    expect(report.dnsReady).toBe(true);
    expect(report.replyCaptureReady).toBe(true);
    expect(report.checks.find((check) => check.label === "OUTREACH_EMAIL_MX")?.ready).toBe(true);
    expect(report.checks.find((check) => check.label === "OUTREACH_EMAIL_DKIM")?.detail).toContain("default");
  });

  it("keeps the alias test pending because DNS cannot prove mailbox delivery", () => {
    const report = evaluateOutreachEmailDns({
      mxRecords: NAMECHEAP_MX,
      apexTxtRecords: [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]],
      dmarcTxtRecords: [["v=DMARC1; p=none"]],
      dkimSelectors: ["default"],
      dkimTxtRecordSets: [[["v=DKIM1; k=rsa; p=abc123"]]],
    });

    const aliasCheck = report.checks.find((check) => check.label === "OUTREACH_EMAIL_ALIAS_TEST");

    expect(report.dnsReady).toBe(true);
    expect(report.ready).toBe(false);
    expect(report.replyCaptureReady).toBe(false);
    expect(aliasCheck?.ready).toBe(false);
    expect(aliasCheck?.detail).toContain("rerun with --reply-capture-evidence and --reply-capture-challenge");
  });

  it("lets browser-form reply capture pass after recorded evidence without pretending outbound auth is ready", () => {
    const evidenceResult = evaluateReplyCaptureEvidence({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T02:30:00.000Z",
    });
    const report = evaluateOutreachEmailDns({
      aliasTested: evidenceResult.ready,
      replyCaptureEvidenceResult: evidenceResult,
      mxRecords: NAMECHEAP_MX,
      apexTxtRecords: [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]],
      dmarcTxtRecords: [],
      dkimSelectors: ["default", "google"],
      dkimTxtRecordSets: [[], []],
    });
    const rendered = renderOutreachEmailReport(report);

    expect(evidenceResult.ready).toBe(true);
    expect(report.replyCaptureReady).toBe(true);
    expect(report.ready).toBe(false);
    expect(rendered).toContain("OUTREACH_EMAIL_ALIAS_TEST=pass evidence receivedAt=2026-06-17T02:30:00.000Z");
    expect(rendered).toContain(
      "OUTREACH_EMAIL_REPLY_CAPTURE=pass forwarding MX and manual alias delivery test are both present",
    );
    expect(rendered).toContain("OUTREACH_EMAIL_READY=false");
    expect(rendered).toContain("OUTREACH_EMAIL_NEXT=configure authenticated outbound sender, publish DKIM and DMARC");
    expect(rendered).not.toContain("OUTREACH_EMAIL_ALIAS_NEXT=");
  });

  it("rejects reply-capture evidence that does not prove the controlled inbox received the alias test", () => {
    const evidenceResult = evaluateReplyCaptureEvidence({
      contactEmail: "wrong@traceready.online",
      receivedInControlledInbox: false,
      receivedAt: "not-a-date",
    });

    expect(evidenceResult.ready).toBe(false);
    expect(evidenceResult.errors).toContain("contactEmail must be founder@traceready.online");
    expect(evidenceResult.errors).toContain("receivedInControlledInbox must be true");
    expect(evidenceResult.errors).toContain("receivedAt must be a valid ISO timestamp");
  });

  it("rejects challenge evidence received before the challenge was created", () => {
    const evidenceResult = evaluateReplyCaptureEvidence({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T02:59:59.000Z",
      challengeToken: "trc-test-1234",
      challengeCreatedAt: "2026-06-17T03:00:00.000Z",
      challengeSubject: "TraceReady reply-capture test trc-test-1234",
    });

    expect(evidenceResult.ready).toBe(false);
    expect(evidenceResult.errors).toContain("receivedAt must be after challengeCreatedAt");
  });

  it("rejects incomplete challenge metadata in reply-capture evidence", () => {
    const evidenceResult = evaluateReplyCaptureEvidence({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T03:04:00.000Z",
      challengeToken: "trc-test-1234",
    });

    expect(evidenceResult.ready).toBe(false);
    expect(evidenceResult.errors).toContain("challengeCreatedAt must be a valid ISO timestamp when challenge metadata is present");
    expect(evidenceResult.errors).toContain("challengeSubject must be a non-empty string when challenge metadata is present");
  });

  it("rejects challenge evidence whose subject does not contain the challenge token", () => {
    const evidenceResult = evaluateReplyCaptureEvidence({
      contactEmail: "founder@traceready.online",
      receivedInControlledInbox: true,
      receivedAt: "2026-06-17T03:04:00.000Z",
      challengeToken: "trc-test-1234",
      challengeCreatedAt: "2026-06-17T03:00:00.000Z",
      challengeSubject: "TraceReady reply-capture test wrong-token",
    });

    expect(evidenceResult.ready).toBe(false);
    expect(evidenceResult.errors).toContain("challengeSubject must include challengeToken");
  });

  it("rejects reply-capture evidence that does not match the expected challenge file", () => {
    const evidenceResult = evaluateReplyCaptureEvidence(
      {
        contactEmail: "founder@traceready.online",
        receivedInControlledInbox: true,
        receivedAt: "2026-06-17T03:04:00.000Z",
        challengeToken: "trc-test-1234",
        challengeCreatedAt: "2026-06-17T03:00:00.000Z",
        challengeSubject: "TraceReady reply-capture test trc-test-1234",
      },
      {
        expectedChallenge: {
          contactEmail: "founder@traceready.online",
          createdAt: "2026-06-17T03:00:00.000Z",
          challengeToken: "trc-test-9999",
          subject: "TraceReady reply-capture test trc-test-9999",
        },
      },
    );

    expect(evidenceResult.ready).toBe(false);
    expect(evidenceResult.errors).toContain("challengeToken must match reply-capture challenge");
    expect(evidenceResult.errors).toContain("challengeSubject must match reply-capture challenge");
  });

  it("flags the current pre-send failure mode when DMARC and DKIM are missing", () => {
    const report = evaluateOutreachEmailDns({
      mxRecords: NAMECHEAP_MX,
      apexTxtRecords: [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]],
      dmarcTxtRecords: [],
      dkimSelectors: ["default", "google"],
      dkimTxtRecordSets: [[], []],
    });

    const rendered = renderOutreachEmailReport(report);

    expect(report.ready).toBe(false);
    expect(rendered).toContain("OUTREACH_EMAIL_DMARC=pending records=none");
    expect(rendered).toContain("OUTREACH_EMAIL_DKIM=pending selectors=none");
    expect(rendered).toContain("OUTREACH_EMAIL_REPLY_CAPTURE=pending requires forwarding MX plus a manual alias delivery test");
    expect(rendered).toContain("OUTREACH_EMAIL_DNS_READY=false");
    expect(rendered).toContain("OUTREACH_EMAIL_READY=false");
    expect(rendered).toContain("OUTREACH_EMAIL_DMARC_STARTER=TXT _dmarc");
    expect(rendered).toContain("OUTREACH_EMAIL_ALIAS_NEXT=create Namecheap Redirect Email alias founder");
    expect(rendered).toContain("npm run prepare:reply-capture");
    expect(rendered).toContain("--handoff-output private/reply-capture-handoff.md");
    expect(rendered).toContain("--email-draft-output private/reply-capture-email.eml");
    expect(rendered).toContain("record private reply-capture evidence");
    expect(rendered).toContain("then rerun with --reply-capture-evidence and --reply-capture-challenge");
  });

  it("supports injected DNS resolution for deterministic checks", async () => {
    const report = await inspectOutreachEmailDns({
      domain: "example.test",
      contactEmail: "founder@example.test",
      dkimSelectors: ["selector-a"],
      aliasTested: true,
      resolver: {
        async mx() {
          return NAMECHEAP_MX;
        },
        async txt(hostname) {
          if (hostname === "example.test") {
            return [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]];
          }
          if (hostname === "_dmarc.example.test") {
            return [["v=DMARC1; p=none"]];
          }
          return [["v=DKIM1; k=rsa; p=abc123"]];
        },
      },
    });

    expect(report.domain).toBe("example.test");
    expect(report.contactEmail).toBe("founder@example.test");
    expect(report.ready).toBe(true);
  });

  it("keeps reply capture pending instead of crashing when the evidence file is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-missing-reply-"));
    const missingEvidencePath = path.join(tempDir, "reply-capture-evidence.json");

    const report = await inspectOutreachEmailDns({
      replyCaptureEvidencePath: missingEvidencePath,
      replyCaptureChallenge: {
        contactEmail: "founder@traceready.online",
        createdAt: "2026-06-17T03:00:00.000Z",
        challengeToken: "trc-test-1234",
        subject: "TraceReady reply-capture test trc-test-1234",
      },
      resolver: {
        async mx() {
          return NAMECHEAP_MX;
        },
        async txt(hostname) {
          if (hostname === "traceready.online") {
            return [["v=spf1 include:spf.efwd.registrar-servers.com ~all"]];
          }
          if (hostname === "_dmarc.traceready.online") {
            return [["v=DMARC1; p=none"]];
          }
          return [["v=DKIM1; k=rsa; p=abc123"]];
        },
      },
    });
    const rendered = renderOutreachEmailReport(report);

    expect(report.replyCaptureReady).toBe(false);
    expect(report.ready).toBe(false);
    expect(rendered).toContain("OUTREACH_EMAIL_ALIAS_TEST=pending");
    expect(rendered).toContain(`reply-capture evidence file not found: ${missingEvidencePath}`);
    expect(rendered).toContain("OUTREACH_EMAIL_ALIAS_NEXT=");
  });

  it("parses domain, contact, and extra DKIM selector options", () => {
    expect(
      parseOutreachEmailArgs([
        "--domain",
        "example.test",
        "--contact",
        "desk@example.test",
        "--dkim-selector",
        "mailgun",
        "--reply-capture-evidence",
        "private/reply-capture-evidence.json",
        "--reply-capture-challenge",
        "private/reply-capture-challenge.json",
        "--alias-tested",
      ]),
    ).toEqual({
      domain: "example.test",
      contactEmail: "desk@example.test",
      dkimSelectors: ["default", "google", "selector1", "selector2", "mailgun"],
      replyCaptureEvidencePath: "private/reply-capture-evidence.json",
      replyCaptureChallengePath: "private/reply-capture-challenge.json",
      aliasTested: true,
    });
  });
});
