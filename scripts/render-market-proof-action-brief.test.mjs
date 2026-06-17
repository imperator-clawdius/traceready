import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import {
  parseMarketProofActionBriefArgs,
  renderMarketProofActionBrief,
} from "./render-market-proof-action-brief.mjs";

const SCORE = {
  currentState: "proof_ready_reply_capture_at_risk_traction_unmeasured",
  nextGate: "verify_reply_capture_before_external_submission",
  publicProof: {
    recordsAnalyzed: 57658,
    pointOnlyOver4ha: 46134,
    missingPlotIds: 57658,
    missingSupplierIdentity: 57658,
    readyRecords: 0,
    readinessScore: "0/100",
  },
  outreach: {
    readyBrowserFormRoutes: 4,
    packetReadyRoutes: 4,
    submitPreflightReadyRoutes: 0,
    liveSubmitStatus: "pending",
    liveSubmitCheckedRoutes: 4,
    liveSubmitReadyRoutes: 0,
    liveSubmitReplyCaptureHeldRoutes: ["b02-r03", "b02-r04", "b02-r09", "b02-r20"],
    sentOrBeyond: 0,
    replies: 0,
    fileChecks: 0,
    paidOrders: 0,
    pilotRequests: 0,
    readyRoutes: [
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
    ],
  },
  email: {
    ready: false,
    replyCaptureReady: false,
  },
};

const SALE_READINESS = {
  status: "pending",
  currentState: "sale_blocked_email_intake_unverified",
  nextGate: "verify_reply_capture_before_accepting_paid_files",
  checks: {
    publicProofReady: true,
    checkoutReady: true,
    paidFileIntakeReady: false,
    outboundReady: false,
    realMarketSignal: false,
  },
  publicProof: {
    recordsAnalyzed: 57658,
  },
  checkout: {
    contactEmail: "founder@traceready.online",
    stripeCleanupReady: true,
    stripePilotReady: true,
  },
  traction: {
    replies: 0,
    fileChecks: 0,
    pilotRequests: 0,
    paidOrders: 0,
  },
};

describe("market proof action brief", () => {
  it("renders a compact next-action brief without claiming traction", () => {
    const markdown = renderMarketProofActionBrief(SCORE, {
      generatedAt: "2026-06-17",
      saleReadiness: SALE_READINESS,
      replyCaptureChallenge: {
        contactEmail: "founder@traceready.online",
        subject: "TraceReady reply-capture test trc-20260617-ae6acb63",
        body: "TraceReady reply-capture test for founder@traceready.online.\nChallenge token: trc-20260617-ae6acb63",
      },
    });

    expect(markdown).toContain("# TraceReady market-proof action brief - 2026-06-17");
    expect(markdown).toContain("Current state: `proof_ready_reply_capture_at_risk_traction_unmeasured`");
    expect(markdown).toContain("Next gate: `verify_reply_capture_before_external_submission`");
    expect(markdown).toContain("57,658 public rows analyzed");
    expect(markdown).toContain("46,134 point-only plots over 4 hectares");
    expect(markdown).toContain("0 ready records");
    expect(markdown).toContain("This is public problem proof, not customer traction.");
    expect(markdown).toContain("## Sale Readiness");
    expect(markdown).toContain(
      "SALE_READINESS=pending state=sale_blocked_email_intake_unverified next_gate=verify_reply_capture_before_accepting_paid_files",
    );
    expect(markdown).toContain("| Public proof | pass | 57,658-row problem proof is live |");
    expect(markdown).toContain("| Stripe checkout | pass | cleanup=pass pilot=pass |");
    expect(markdown).toContain("| Paid-file intake | pending | founder@traceready.online is not proven by reply-capture evidence |");
    expect(markdown).toContain(
      "Do not treat Stripe checkout as sale-ready until the paid-file intake inbox is proven.",
    );
    expect(markdown).toContain("Reply capture is not proven yet.");
    expect(markdown).toContain("Subject: `TraceReady reply-capture test trc-20260617-ae6acb63`");
    expect(markdown).toContain("Save the received message source as `private/reply-capture-received.eml`");
    expect(markdown).toContain(
      "The saved `.eml` must show `founder@traceready.online` in `To`, `Delivered-To`, `X-Original-To`, `Envelope-To`, or another recipient/delivery header.",
    );
    expect(markdown).toContain("npm run finalize:reply-capture");
    expect(markdown).toContain("| `b02-r03` | Control Union |");
    expect(markdown).toContain("| `b02-r04` | Bureau Veritas |");
    expect(markdown).toContain(
      "Do not submit external forms until reply capture passes and action-time confirmation is explicit.",
    );
    expect(markdown).toContain("After a form shows success, record it with `npm run record:submission-evidence`.");
    expect(markdown).toContain("--confirm-visible-success");
    expect(markdown).toContain("External submissions completed | 0");
    expect(markdown).toContain("Live submit routes checked | 4");
    expect(markdown).toContain("Live submit route report status | pending");
    expect(markdown).toContain("Replies | 0");
    expect(markdown).toContain("Paid cleanup orders | 0");
  });

  it("switches the next action after reply capture is proven", () => {
    const markdown = renderMarketProofActionBrief(
      {
        ...SCORE,
        currentState: "proof_ready_live_submit_ready_traction_unmeasured",
        nextGate: "submit_verified_public_forms_after_action_time_confirmation",
        outreach: {
          ...SCORE.outreach,
          submitPreflightReadyRoutes: 4,
          liveSubmitStatus: "pass",
          liveSubmitCheckedRoutes: 4,
          liveSubmitReadyRoutes: 4,
          liveSubmitReplyCaptureHeldRoutes: [],
        },
        email: {
          ready: false,
          replyCaptureReady: true,
        },
      },
      {
        generatedAt: "2026-06-17",
        saleReadiness: {
          ...SALE_READINESS,
          status: "pending",
          currentState: "sale_intake_ready_outbound_auth_pending",
          nextGate: "publish_dmarc_dkim_and_outbound_sender_auth",
          checks: {
            ...SALE_READINESS.checks,
            paidFileIntakeReady: true,
          },
        },
      },
    );

    expect(markdown).toContain("Reply capture is proven.");
    expect(markdown).toContain("Use `private/preflight-submit-queue.md` for the next action-time confirmation.");
    expect(markdown).toContain("SALE_READINESS=pending state=sale_intake_ready_outbound_auth_pending");
    expect(markdown).not.toContain("Reply capture is not proven yet.");
  });

  it("parses the default CLI output path and data inputs", () => {
    expect(
      parseMarketProofActionBriefArgs([
        "--output",
        "private/market-proof-action-brief-2026-06-17.md",
        "--today",
        "2026-06-17",
        "--reply-capture-challenge",
        "private/reply-capture-challenge.json",
      ]),
    ).toMatchObject({
      outputPath: "private/market-proof-action-brief-2026-06-17.md",
      generatedAt: "2026-06-17",
      replyCaptureChallengePath: "private/reply-capture-challenge.json",
    });
  });

  it("is wired as an npm script for regenerating the private action brief", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["render:market-proof-brief"]).toBe(
      "node scripts/render-market-proof-action-brief.mjs",
    );
  });
});
