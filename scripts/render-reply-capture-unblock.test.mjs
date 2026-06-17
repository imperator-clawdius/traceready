import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildReplyCaptureUnblockPacket,
  parseReplyCaptureUnblockArgs,
  renderReplyCaptureUnblockPacket,
} from "./render-reply-capture-unblock.mjs";

const CHALLENGE = {
  contactEmail: "founder@traceready.online",
  createdAt: "2026-06-17T02:45:27.058Z",
  challengeToken: "trc-20260617-ae6acb63",
  subject: "TraceReady reply-capture test trc-20260617-ae6acb63",
  body: "TraceReady reply-capture test for founder@traceready.online.\nChallenge token: trc-20260617-ae6acb63",
};

const READY_ROUTES = [
  {
    route_id: "b02-r03",
    company_or_channel: "Control Union",
    route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
  },
  {
    route_id: "b02-r04",
    company_or_channel: "Bureau Veritas",
    route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
  },
];

const EMAIL_REPORT_PENDING = {
  replyCaptureReady: false,
  ready: false,
  checks: [
    {
      label: "OUTREACH_EMAIL_MX",
      ready: true,
      detail: "found=eforward1.registrar-servers.com",
    },
    {
      label: "OUTREACH_EMAIL_DMARC",
      ready: false,
      detail: "records=none",
    },
    {
      label: "OUTREACH_EMAIL_DKIM",
      ready: false,
      detail: "selectors=none",
    },
    {
      label: "OUTREACH_EMAIL_ALIAS_TEST",
      ready: false,
      detail: "reply-capture evidence file not found",
    },
  ],
};

describe("reply-capture unblock packet", () => {
  it("renders the single external action and the routes blocked behind it", () => {
    const packet = buildReplyCaptureUnblockPacket({
      challenge: CHALLENGE,
      readyRoutes: READY_ROUTES,
      evidenceExists: false,
      emlExists: false,
      emailReport: EMAIL_REPORT_PENDING,
    });
    const markdown = renderReplyCaptureUnblockPacket(packet, { generatedAt: "2026-06-17" });

    expect(markdown).toContain("# TraceReady reply-capture unblock - 2026-06-17");
    expect(markdown).toContain("REPLY_CAPTURE_UNBLOCK=pending status=waiting_for_inbox_receipt");
    expect(markdown).toContain("Reply capture ready: no");
    expect(markdown).toContain("## Email Risk Snapshot");
    expect(markdown).toContain("| OUTREACH_EMAIL_MX | pass | found=eforward1.registrar-servers.com |");
    expect(markdown).toContain("| OUTREACH_EMAIL_DMARC | pending | records=none |");
    expect(markdown).toContain("| OUTREACH_EMAIL_DKIM | pending | selectors=none |");
    expect(markdown).toContain("Reply capture is the submission gate.");
    expect(markdown).toContain("v=DMARC1; p=none; rua=mailto:founder@traceready.online; adkim=r; aspf=r");
    expect(markdown).toContain("Send this challenge from a separate mailbox");
    expect(markdown).toContain("To: `founder@traceready.online`");
    expect(markdown).toContain("Subject: `TraceReady reply-capture test trc-20260617-ae6acb63`");
    expect(markdown).toContain(
      "[Open mail draft](mailto:founder%40traceready.online?subject=TraceReady%20reply-capture%20test%20trc-20260617-ae6acb63",
    );
    expect(markdown).toContain("Optional local draft: `private/reply-capture-email.eml`");
    expect(markdown).toContain("Challenge token: trc-20260617-ae6acb63");
    expect(markdown).toContain("save the received message source as `private/reply-capture-received.eml`");
    expect(markdown).toContain(
      "The saved `.eml` must include the original `Date` and `Subject` headers plus the message body carrying the challenge token.",
    );
    expect(markdown).toContain(
      "It must also show `founder@traceready.online` in `To`, `Delivered-To`, `X-Original-To`, `Envelope-To`, or another recipient/delivery header.",
    );
    expect(markdown).toContain(
      "Manually typed timestamps are not enough for challenge-bound reply capture; use the saved `.eml` message source so TraceReady can verify the alias delivery headers.",
    );
    expect(markdown).toContain("npm run finalize:reply-capture");
    expect(markdown).toContain("npm run render:outreach-email-runbook");
    expect(markdown).toContain("| `b02-r03` | Control Union |");
    expect(markdown).toContain("| `b02-r04` | Bureau Veritas |");
    expect(markdown).toContain("Do not submit external forms, mark routes sent, or measure non-response");
  });

  it("switches to finalizer-first status when the received eml is already saved", () => {
    const packet = buildReplyCaptureUnblockPacket({
      challenge: CHALLENGE,
      readyRoutes: READY_ROUTES,
      evidenceExists: false,
      emlExists: true,
      emailReport: EMAIL_REPORT_PENDING,
    });
    const markdown = renderReplyCaptureUnblockPacket(packet, { generatedAt: "2026-06-17" });

    expect(markdown).toContain("REPLY_CAPTURE_UNBLOCK=pending status=eml_saved_finalize_next");
    expect(markdown).toContain("Received message source: `private/reply-capture-received.eml` (found)");
    expect(markdown).toContain("The received `.eml` is saved. Run the finalizer now");
  });

  it("switches to pass status after reply capture evidence is ready", () => {
    const packet = buildReplyCaptureUnblockPacket({
      challenge: CHALLENGE,
      readyRoutes: READY_ROUTES,
      evidenceExists: true,
      emlExists: true,
      emailReport: { ...EMAIL_REPORT_PENDING, replyCaptureReady: true, ready: false },
    });
    const markdown = renderReplyCaptureUnblockPacket(packet, { generatedAt: "2026-06-17" });

    expect(markdown).toContain("REPLY_CAPTURE_UNBLOCK=pass status=ready");
    expect(markdown).toContain("Reply capture is proven. DMARC, DKIM, and outbound sender auth may still need cleanup");
    expect(markdown).toContain("Reply capture is proven. Use `private/preflight-submit-queue.md`");
  });

  it("parses CLI paths for the private unblock packet", () => {
    expect(
      parseReplyCaptureUnblockArgs([
        "--challenge",
        "private/challenge.json",
        "--evidence",
        "private/evidence.json",
        "--eml",
        "private/received.eml",
        "--email-draft",
        "private/draft.eml",
        "--output",
        "private/unblock.md",
        "--today",
        "2026-06-17",
      ]),
    ).toMatchObject({
      challengePath: "private/challenge.json",
      evidencePath: "private/evidence.json",
      emlPath: "private/received.eml",
      emailDraftPath: "private/draft.eml",
      outputPath: "private/unblock.md",
      generatedAt: "2026-06-17",
    });
  });

  it("is wired as an npm script", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["render:reply-capture-unblock"]).toBe(
      "node scripts/render-reply-capture-unblock.mjs",
    );
  });
});
