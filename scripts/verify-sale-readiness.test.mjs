import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkoutOffer, evaluateProviderEvidence, evaluateRenderedCheckout, evaluateSaleReadiness, inspectRenderedCheckout, parseSaleReadinessArgs, renderSaleReadinessReport } from "./verify-sale-readiness.mjs";

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

  it("renders the exact reply-capture unblock action when file intake is blocked", () => {
    const report = evaluateSaleReadiness({
      publicProof: PUBLIC_PROOF,
      checkout: CHECKOUT_DEPENDENCIES,
      email: {
        replyCaptureReady: false,
        ready: false,
        checks: {
          OUTREACH_EMAIL_MX: true,
          OUTREACH_EMAIL_ALIAS_TEST: false,
        },
        replyCaptureChallenge: {
          subject: "TraceReady reply-capture test trc-test-1234",
          challengeToken: "trc-test-1234",
        },
        replyCaptureEvidencePath: "private/reply-capture-evidence.json",
        replyCaptureChallengePath: "private/reply-capture-challenge.json",
        replyCaptureEmlPath: "private/reply-capture-received.eml",
      },
      traction: {
        paidOrders: 0,
        fileChecks: 0,
        pilotRequests: 0,
        replies: 0,
      },
    });
    const markdown = renderSaleReadinessReport(report, { generatedAt: "2026-06-17" });

    expect(markdown).toContain("## Reply-Capture Unblock");
    expect(markdown).toContain("Subject: `TraceReady reply-capture test trc-test-1234`");
    expect(markdown).toContain("Token: `trc-test-1234`");
    expect(markdown).toContain("Received message source: `private/reply-capture-received.eml`");
    expect(markdown).toContain(
      "The saved `.eml` must show `founder@traceready.online` in `To`, `Delivered-To`, `X-Original-To`, `Envelope-To`, or another recipient/delivery header.",
    );
    expect(markdown).toContain(
      "Manually typed timestamps are not enough for challenge-bound reply capture; use the saved `.eml` message source so TraceReady can verify the alias delivery headers.",
    );
    expect(markdown).toContain("Evidence output: `private/reply-capture-evidence.json`");
    expect(markdown).toContain("npm run finalize:reply-capture");
    expect(markdown).toContain(
      "npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --from-eml private/reply-capture-received.eml --challenge private/reply-capture-challenge.json --confirm-controlled-inbox",
    );
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

  it("reports market signal separately after proof, checkout, and email operations pass", () => {
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

  it("allows scoped sales before the first market signal exists", () => {
    const report = evaluateSaleReadiness({
      publicProof: PUBLIC_PROOF,
      checkout: CHECKOUT_DEPENDENCIES,
      email: { replyCaptureReady: true, ready: true },
      traction: {},
    });
    expect(report.status).toBe("pass");
    expect(report.currentState).toBe("sale_ops_ready_traction_unmeasured");
    expect(report.checks.realMarketSignal).toBe(false);
    expect(renderSaleReadinessReport(report)).toContain("traction is not a prerequisite for opening checkout");
  });

  it("keeps overall readiness pending when one paid offer remains unavailable", () => {
    const report = evaluateSaleReadiness({ publicProof: PUBLIC_PROOF, checkout: { ...CHECKOUT_DEPENDENCIES, stripePilotReady: false }, email: { replyCaptureReady: true, ready: true } });
    expect(report.status).toBe("pending");
    expect(report.currentState).toBe("sale_blocked_checkout_not_verified");
    expect(report.checkout.stripeCleanupReady).toBe(true);
  });
});

const NOW = Date.parse("2026-10-02T18:00:00.000Z");
function renderedOffer(offer) {
  const expected = checkoutOffer(offer);
  return `<main><h1>${expected.title}</h1><p>${expected.price}</p><fieldset data-checkout-url="${expected.stripeHref}"><label><input type="checkbox" required>Scope confirmed</label><button disabled>Continue to Stripe checkout</button></fieldset><a href="/order-intake/">Order intake</a><a href="mailto:founder@traceready.online?subject=scope">Ask a scope question</a></main>`;
}
function providerEvidence(offer) {
  const expected = checkoutOffer(offer);
  return { href: expected.stripeHref, title: expected.title, amount: Number(expected.price.slice(1)) * 100, currency: "usd", active: true, verifiedAt: new Date(NOW).toISOString(), verificationMethod: "rendered_stripe_checkout" };
}

describe("built checkout evidence", () => {
  it.each(["cleanup", "pilot"])("recognizes the %s confirmation control in rendered HTML", (offer) => {
    expect(evaluateRenderedCheckout(renderedOffer(offer), { offer })).toEqual({ ready: true, errors: [] });
  });

  it("does not count URLs or markup embedded only in scripts as a public checkout", () => {
    const html = `<main><h1>TraceReady 24-hour cleanup</h1><p>$149</p><a href="mailto:founder@traceready.online">Email scope request first</a></main><script type="application/json">${JSON.stringify(renderedOffer("cleanup"))}</script>`;
    expect(evaluateRenderedCheckout(html, { offer: "cleanup" }).ready).toBe(false);
  });

  it.each([
    ["incorrect price", (html) => html.replace("$149", "$745")],
    ["incorrect title", (html) => html.replace("24-hour cleanup", "5-file pilot")],
    ["wrong destination", (html) => html.replace(checkoutOffer("cleanup").stripeHref, checkoutOffer("pilot").stripeHref)],
    ["optional scope checkbox", (html) => html.replace(" required", "")],
    ["disabled handoff", (html) => html.replace("<fieldset ", "<fieldset disabled ")],
    ["wrong inbox", (html) => html.replace("founder@traceready.online", "wrong@example.com")],
    ["missing intake route", (html) => html.replace("/order-intake/", "/")],
    ["payment before confirmation", (html) => `${html}<a href="${checkoutOffer("cleanup").stripeHref}">Pay now</a>`],
  ])("rejects %s", (_label, change) => {
    expect(evaluateRenderedCheckout(change(renderedOffer("cleanup")), { offer: "cleanup" }).ready).toBe(false);
  });

  it("reports absent build files explicitly instead of inspecting source strings", async () => {
    const siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-no-build-"));
    const result = await inspectRenderedCheckout({ siteDir, approvalPath: path.join(siteDir, "missing.json"), now: NOW });
    expect(result.stripeCleanupReady).toBe(false);
    expect(result.stripePilotReady).toBe(false);
    expect(result.errors.some((error) => error.includes("missing built page") && error.includes("run npm run build"))).toBe(true);
  });

  it("requires both real built routes and active provider evidence for each offer", async () => {
    const siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-checkout-build-"));
    for (const offer of ["cleanup", "pilot"]) {
      await fs.mkdir(path.join(siteDir, "checkout", offer), { recursive: true });
      await fs.writeFile(path.join(siteDir, "checkout", offer, "index.html"), renderedOffer(offer));
    }
    await fs.mkdir(path.join(siteDir, "order-intake"));
    await fs.writeFile(path.join(siteDir, "order-intake", "index.html"), '<a href="mailto:founder@traceready.online?subject=intake">Email intake checklist</a>');
    const approvalPath = path.join(siteDir, "approval.json");
    await fs.writeFile(approvalPath, JSON.stringify({ offers: { cleanup: providerEvidence("cleanup"), pilot: { ...providerEvidence("pilot"), active: false } } }));
    const result = await inspectRenderedCheckout({ siteDir, approvalPath, now: NOW });
    expect(result.stripeCleanupReady).toBe(true);
    expect(result.stripePilotReady).toBe(false);
    expect(result.offers.pilot.handoffReady).toBe(true);
    expect(result.offers.pilot.providerReady).toBe(false);
    expect(result.errors).toContain("pilot provider: provider checkout is not confirmed active");
  });

  it("accepts an explicit site directory", () => {
    expect(parseSaleReadinessArgs(["--site-dir", "preview/out"]).siteDir).toBe("preview/out");
  });
});

describe("provider checkout evidence", () => {
  it("accepts a recent rendered checkout inspection for the exact offer", () => {
    expect(evaluateProviderEvidence("cleanup", providerEvidence("cleanup"), { now: NOW }).ready).toBe(true);
  });

  it.each([
    { active: false },
    { amount: 100 },
    { href: "https://buy.stripe.com/other" },
    { currency: "eur" },
    { verificationMethod: "http_200" },
    { verifiedAt: "2026-06-18T00:00:00.000Z" },
    { verifiedAt: "2027-01-01T00:00:00.000Z" },
  ])("rejects insufficient provider proof: %j", (overrides) => {
    expect(evaluateProviderEvidence("cleanup", { ...providerEvidence("cleanup"), ...overrides }, { now: NOW }).ready).toBe(false);
  });
});
