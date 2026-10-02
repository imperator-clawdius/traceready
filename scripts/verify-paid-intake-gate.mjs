import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_APPROVAL_PATH = "docs/paid-intake-approval.json";

export function parsePaidIntakeGateArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--approval") {
      options.approvalPath = value;
    } else if (flag === "--public-flag") {
      options.publicFlag = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export async function verifyPaidIntakeGate(options = {}) {
  const publicFlag = String(options.publicFlag ?? process.env.NEXT_PUBLIC_PAID_ORDER_INTAKE_READY ?? "");
  const publicCheckoutEnabled = publicFlag === "true";
  const approvalPath = path.resolve(options.approvalPath ?? DEFAULT_APPROVAL_PATH);
  const errors = [];

  if (!publicCheckoutEnabled) {
    return {
      ready: true,
      state: "locked",
      publicFlag: false,
      approvalPath,
      approvalRequired: false,
      errors,
    };
  }

  const approval = await readApproval(approvalPath, errors);
  if (!approval) {
    return {
      ready: false,
      state: "approval_missing",
      publicFlag: true,
      approvalPath,
      approvalRequired: true,
      errors,
    };
  }

  validateApproval(approval, errors);

  return {
    ready: errors.length === 0,
    state: errors.length === 0 ? "public_checkout_enabled" : "approval_invalid",
    publicFlag: true,
    approvalPath,
    approvalRequired: true,
    errors,
  };
}

export function renderPaidIntakeGateVerification(result) {
  const status = result.ready ? "pass" : "pending";
  const approval = result.approvalRequired ? result.approvalPath : "not_required";
  const lines = [
    `PAID_INTAKE_GATE=${status} state=${result.state} public_flag=${String(result.publicFlag)} approval=${approval}`,
  ];

  for (const error of result.errors) {
    lines.push(`PAID_INTAKE_GATE_ERROR=${error}`);
  }

  return lines.join("\n");
}

async function readApproval(approvalPath, errors) {
  try {
    return JSON.parse(await fs.readFile(approvalPath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      errors.push(`public paid intake cannot be enabled without approval file: ${approvalPath}`);
      return null;
    }

    errors.push(`approval file could not be read as JSON: ${error.message}`);
    return null;
  }
}

function validateApproval(approval, errors) {
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
    errors.push("approval must be an object");
    return;
  }
  if (approval.schemaVersion !== 2) errors.push("approval schemaVersion must be 2");
  if (approval.replyCaptureReady !== true) {
    errors.push("approval replyCaptureReady must be true");
  }
  if (approval.outboundReady !== true) errors.push("approval outboundReady must be true");

  if (approval.approvedForPublicCheckout !== true) {
    errors.push("approval approvedForPublicCheckout must be true");
  }

  if (!isNonEmptyString(approval.approver)) {
    errors.push("approval approver must be a non-empty string");
  }

  if (!isValidIsoTimestamp(approval.approvedAt)) {
    errors.push("approval approvedAt must be a valid ISO timestamp");
  }

  if (!isNonEmptyString(approval.evidence?.replyCaptureEvidencePath)) {
    errors.push("approval evidence.replyCaptureEvidencePath must be a non-empty string");
  }

  if (!isValidIsoTimestamp(approval.evidence?.emailVerifiedAt)) errors.push("approval evidence.emailVerifiedAt must be a valid ISO timestamp");
  if (!isNonEmptyString(approval.evidence?.fulfillmentRunbook)) errors.push("approval evidence.fulfillmentRunbook must be a non-empty string");
  const expectedOffers = { cleanup: 14900, pilot: 74500 };
  let activeOffers = 0;
  for (const [name, amount] of Object.entries(expectedOffers)) {
    const offer = approval.offers?.[name];
    if (!offer || typeof offer.active !== "boolean") {
      errors.push(`approval offers.${name} must declare active true or false`);
      continue;
    }
    if (!offer.active) continue;
    activeOffers++;
    if (!/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(offer.href ?? "")) errors.push(`approval offers.${name}.href must be a Stripe Payment Link`);
    if (offer.amount !== amount || offer.currency !== "usd") errors.push(`approval offers.${name} must match the advertised USD price`);
    if (!isNonEmptyString(offer.title)) errors.push(`approval offers.${name}.title must be present`);
    if (!isValidIsoTimestamp(offer.verifiedAt) || offer.verificationMethod !== "rendered_stripe_checkout") errors.push(`approval offers.${name} requires rendered checkout verification`);
    const configured = process.env[name === "cleanup" ? "NEXT_PUBLIC_STRIPE_PAYMENT_LINK" : "NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK"];
    if (configured && configured !== offer.href) errors.push(`approval offers.${name}.href differs from the build payment link`);
  }
  if (!activeOffers) errors.push("approval requires at least one verified active offer");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyPaidIntakeGate(parsePaidIntakeGateArgs());
    console.log(renderPaidIntakeGateVerification(result));
    process.exitCode = result.ready ? 0 : 1;
  } catch (error) {
    console.error(`PAID_INTAKE_GATE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
