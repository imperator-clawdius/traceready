import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  renderPaidIntakeGateVerification,
  verifyPaidIntakeGate,
} from "./verify-paid-intake-gate.mjs";

describe("paid intake gate verifier", () => {
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

  it("fails when the approval record does not prove reply capture and market signal readiness", async () => {
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
    expect(result.errors).toContain("approval evidence.saleReadinessState must be sale_ready_with_market_signal");
    expect(result.errors).toContain("approval evidence.realMarketSignal must be true");
  });

  it("passes when public checkout has an explicit approval record with operational and market proof", async () => {
    const { approvalPath } = await writeApproval({
      replyCaptureReady: true,
      approvedForPublicCheckout: true,
      approvedAt: "2026-06-17T20:30:00.000Z",
      approver: "TraceReady operator",
      evidence: {
        replyCaptureEvidencePath: "private/reply-capture-evidence.json",
        saleReadinessState: "sale_ready_with_market_signal",
        realMarketSignal: true,
        tractionEvidencePath: "private/traction-readiness-scorecard-2026-06-17.md",
      },
    });

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

  it("is part of the main check gate", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["verify:paid-intake-gate"]).toBe("node scripts/verify-paid-intake-gate.mjs");
    expect(packageJson.scripts.check).toContain("npm run verify:paid-intake-gate");
  });
});

async function writeApproval(approval) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-paid-intake-"));
  const approvalPath = path.join(dir, "paid-intake-approval.json");
  await fs.writeFile(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);

  return { approvalPath };
}
