import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderPaidIntakeGateVerification,
  verifyPaidIntakeGate,
} from "./verify-paid-intake-gate.mjs";

function operationalApproval() {
  return {
    schemaVersion: 2, replyCaptureReady: true, outboundReady: true,
    approvedForPublicCheckout: true, approvedAt: "2026-10-02T14:08:31.000Z",
    approver: "Test operator",
    evidence: { replyCaptureEvidencePath: "private/evidence.json", emailVerifiedAt: "2026-10-02T14:08:31.000Z", fulfillmentRunbook: "docs/fulfillment-runbook.md" },
    offers: {
      cleanup: { href: "https://buy.stripe.com/cleanup123", active: true, amount: 14900, currency: "usd", title: "TraceReady 24-hour cleanup", verifiedAt: "2026-10-02T14:08:31.000Z", verificationMethod: "rendered_stripe_checkout" },
      pilot: { active: false },
    },
  };
}

describe("paid intake gate verifier", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK", "");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("passes by default while public checkout is locked", async () => {
    const approvalPath = path.join(os.tmpdir(), "missing-paid-intake-approval.json");

    const result = await verifyPaidIntakeGate({
      publicFlag: "false",
      approvalPath,
    });
    const report = renderPaidIntakeGateVerification(result);

    expect(result.ready).toBe(true);
    expect(result.state).toBe("locked");
    expect(result.errors).toEqual([]);
    expect(report).toContain("PAID_INTAKE_GATE=pass state=locked public_flag=false approval=not_required");
  });

  it("fails when public checkout is enabled without a deliberate approval record", async () => {
    const approvalPath = path.join(os.tmpdir(), "missing-paid-intake-approval.json");

    const result = await verifyPaidIntakeGate({
      publicFlag: "true",
      approvalPath,
    });

    expect(result.ready).toBe(false);
    expect(result.state).toBe("approval_missing");
    expect(result.errors).toContain(
      `public paid intake cannot be enabled without approval file: ${approvalPath}`,
    );
  });

  it("rejects the old market-signal record without operational checkout evidence", async () => {
    const { approvalPath } = await writeApproval({
      replyCaptureReady: true,
      approvedForPublicCheckout: true,
      approvedAt: "2026-06-17T20:30:00.000Z",
      approver: "TraceReady operator",
      evidence: {
        replyCaptureEvidencePath: "private/reply-capture-evidence.json",
        saleReadinessState: "sale_intake_ready_outbound_auth_pending",
        realMarketSignal: false,
        tractionEvidencePath: "private/traction-readiness-scorecard-2026-06-17.md",
      },
    });

    const result = await verifyPaidIntakeGate({
      publicFlag: "true",
      approvalPath,
    });

    expect(result.ready).toBe(false);
    expect(result.state).toBe("approval_invalid");
    expect(result.errors).toContain("approval schemaVersion must be 2");
    expect(result.errors).toContain("approval outboundReady must be true");
  });

  it("enables the verified offer before the first sale while leaving an inactive offer locked", async () => {
    const { approvalPath } = await writeApproval(operationalApproval());

    const result = await verifyPaidIntakeGate({
      publicFlag: "true",
      approvalPath,
    });
    const report = renderPaidIntakeGateVerification(result);

    expect(result.ready).toBe(true);
    expect(result.state).toBe("public_checkout_enabled");
    expect(result.errors).toEqual([]);
    expect(report).toContain("PAID_INTAKE_GATE=pass state=public_checkout_enabled public_flag=true");
    expect(report).toContain(`approval=${approvalPath}`);
  });

  it.each([
    ["unverified email", (record) => { record.outboundReady = false; }],
    ["inactive offers", (record) => { record.offers.cleanup.active = false; }],
    ["wrong price", (record) => { record.offers.cleanup.amount = 1; }],
    ["unverified provider", (record) => { record.offers.cleanup.verificationMethod = "http_200"; }],
    ["untrusted destination", (record) => { record.offers.cleanup.href = "https://buy.stripe.com.evil.test/pay"; }],
  ])("blocks %s", async (_label, mutate) => {
    const approval = operationalApproval();
    mutate(approval);
    const { approvalPath } = await writeApproval(approval);
    const result = await verifyPaidIntakeGate({ publicFlag: "true", approvalPath });
    expect(result.ready).toBe(false);
  });

  it("is part of the main check gate", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["verify:paid-intake-gate"]).toBe("node scripts/verify-paid-intake-gate.mjs");
    expect(packageJson.scripts.check).toContain("npm run verify:paid-intake-gate");
  });

  it("rejects a configured payment destination that differs from the verified offer", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "https://buy.stripe.com/different123");
    const { approvalPath } = await writeApproval(operationalApproval());
    const result = await verifyPaidIntakeGate({ publicFlag: "true", approvalPath });
    expect(result.errors).toContain("approval offers.cleanup.href differs from the build payment link");
  });
});

async function writeApproval(approval) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-paid-intake-"));
  const approvalPath = path.join(dir, "paid-intake-approval.json");
  await fs.writeFile(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);

  return { approvalPath };
}
