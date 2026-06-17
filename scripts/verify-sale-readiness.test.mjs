import { describe, expect, it } from "vitest";
import { evaluateSaleReadiness, renderSaleReadinessReport } from "./verify-sale-readiness.mjs";

const PUBLIC_PROOF = {
  recordsAnalyzed: 57658,
  pointOnlyOver4ha: 46134,
  readyRecords: 0,
};

const CHECKOUT_DEPENDENCIES = {
  stripeCleanupReady: true,
  stripePilotReady: true,
  paidFileIntakeRequiresEmail: true,
  contactEmail: "founder@traceready.online",
};

describe("sale readiness verifier", () => {
  it("blocks paid sales when checkout is live but file intake email is not proven", () => {
    const report = evaluateSaleReadiness({
      publicProof: PUBLIC_PROOF,
      checkout: CHECKOUT_DEPENDENCIES,
      email: {
        replyCaptureReady: false,
        ready: false,
        checks: {
          OUTREACH_EMAIL_MX: true,
          OUTREACH_EMAIL_ALIAS_TEST: false,
          OUTREACH_EMAIL_DMARC: false,
          OUTREACH_EMAIL_DKIM: false,
          OUTREACH_EMAIL_OUTBOUND_AUTH: false,
        },
      },
      traction: {
        paidOrders: 0,
        fileChecks: 0,
        pilotRequests: 0,
        replies: 0,
      },
    });
    const markdown = renderSaleReadinessReport(report, { generatedAt: "2026-06-17" });

    expect(report.status).toBe("pending");
    expect(report.currentState).toBe("sale_blocked_email_intake_unverified");
    expect(report.nextGate).toBe("verify_reply_capture_before_accepting_paid_files");
    expect(markdown).toContain("SALE_READINESS=pending state=sale_blocked_email_intake_unverified");
    expect(markdown).toContain("| Paid file intake inbox | pending | founder@traceready.online not proven by reply-capture evidence |");
    expect(markdown).toContain("Do not treat Stripe checkout as sale-ready until the paid-file intake inbox is proven.");
  });

  it("keeps sale readiness pending when intake works but outbound cleanup delivery auth is missing", () => {
    const report = evaluateSaleReadiness({
      publicProof: PUBLIC_PROOF,
      checkout: CHECKOUT_DEPENDENCIES,
      email: {
        replyCaptureReady: true,
        ready: false,
        checks: {
          OUTREACH_EMAIL_MX: true,
          OUTREACH_EMAIL_ALIAS_TEST: true,
          OUTREACH_EMAIL_DMARC: false,
          OUTREACH_EMAIL_DKIM: false,
          OUTREACH_EMAIL_OUTBOUND_AUTH: false,
        },
      },
      traction: {
        paidOrders: 0,
        fileChecks: 0,
        pilotRequests: 0,
        replies: 0,
      },
    });

    expect(report.status).toBe("pending");
    expect(report.currentState).toBe("sale_intake_ready_outbound_auth_pending");
    expect(report.nextGate).toBe("publish_dmarc_dkim_and_outbound_sender_auth");
  });

  it("passes only when proof, checkout, email operations, and at least one real market signal are present", () => {
    const report = evaluateSaleReadiness({
      publicProof: PUBLIC_PROOF,
      checkout: CHECKOUT_DEPENDENCIES,
      email: {
        replyCaptureReady: true,
        ready: true,
        checks: {
          OUTREACH_EMAIL_MX: true,
          OUTREACH_EMAIL_ALIAS_TEST: true,
          OUTREACH_EMAIL_DMARC: true,
          OUTREACH_EMAIL_DKIM: true,
          OUTREACH_EMAIL_OUTBOUND_AUTH: true,
        },
      },
      traction: {
        paidOrders: 1,
        fileChecks: 1,
        pilotRequests: 0,
        replies: 1,
      },
    });
    const markdown = renderSaleReadinessReport(report, { generatedAt: "2026-06-17" });

    expect(report.status).toBe("pass");
    expect(report.currentState).toBe("sale_ready_with_market_signal");
    expect(report.nextGate).toBe("fulfill_paid_cleanup_and_capture_permissioned_case");
    expect(markdown).toContain("| Real market signal | pass | replies=1 file_checks=1 pilot_requests=0 paid_orders=1 |");
  });
});
