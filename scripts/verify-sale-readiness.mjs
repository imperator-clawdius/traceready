import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";
import { parseOutreachResults, summarizeOutreachResults } from "./summarize-outreach-results.mjs";

const DEFAULT_PUBLIC_AUDIT_PATH = "docs/public-dataset-mini-audit.md";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-02.csv";
const DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH = "private/reply-capture-evidence.json";
const DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH = "private/reply-capture-challenge.json";
const DEFAULT_REPLY_CAPTURE_EML_PATH = "private/reply-capture-received.eml";
const DEFAULT_OUTPUT_PATH = "private/sale-readiness-report.md";
const DEFAULT_CONTACT_EMAIL = "founder@traceready.online";
const DEFAULT_APPROVAL_PATH = "docs/paid-intake-approval.json";
export const CHECKOUT_OFFERS = {
  cleanup: {
    title: "TraceReady 24-hour cleanup",
    price: "$149",
    stripeHref: "https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01",
  },
  pilot: {
    title: "TraceReady 5-file pilot",
    price: "$745",
    stripeHref: "https://buy.stripe.com/3cIdRbc8g9OX3BL1WZ93y02",
  },
};

export function checkoutOffer(offer) {
  const environmentLink = offer === "cleanup"
    ? process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
    : process.env.NEXT_PUBLIC_STRIPE_PILOT_PAYMENT_LINK;
  return { ...CHECKOUT_OFFERS[offer], stripeHref: environmentLink || CHECKOUT_OFFERS[offer].stripeHref };
}

export function evaluateSaleReadiness({
  publicProof = {},
  checkout = {},
  email = {},
  traction = {},
} = {}) {
  const publicProofReady =
    Number(publicProof.recordsAnalyzed ?? 0) > 0 &&
    Number(publicProof.pointOnlyOver4ha ?? 0) > 0 &&
    Number(publicProof.readyRecords ?? -1) >= 0;
  const checkoutReady = Boolean(checkout.stripeCleanupReady && checkout.stripePilotReady);
  const paidFileIntakeRequiresEmail = checkout.paidFileIntakeRequiresEmail !== false;
  const replyCaptureReady = Boolean(email.replyCaptureReady);
  const outboundReady = Boolean(email.ready);
  const realMarketSignal =
    Number(traction.replies ?? 0) +
      Number(traction.fileChecks ?? 0) +
      Number(traction.pilotRequests ?? 0) +
      Number(traction.paidOrders ?? 0) >
    0;

  let currentState = "sale_ready_with_market_signal";
  let nextGate = "fulfill_paid_cleanup_and_capture_permissioned_case";

  if (!publicProofReady) {
    currentState = "sale_blocked_public_problem_unproven";
    nextGate = "publish_real_public_problem_proof";
  } else if (!checkoutReady) {
    currentState = "sale_blocked_checkout_not_verified";
    nextGate = "verify_cleanup_and_pilot_checkout_links";
  } else if (paidFileIntakeRequiresEmail && !replyCaptureReady) {
    currentState = "sale_blocked_email_intake_unverified";
    nextGate = "verify_reply_capture_before_accepting_paid_files";
  } else if (!outboundReady) {
    currentState = "sale_intake_ready_outbound_auth_pending";
    nextGate = "publish_dmarc_dkim_and_outbound_sender_auth";
  } else if (!realMarketSignal) {
    currentState = "sale_ops_ready_traction_unmeasured";
    nextGate = "capture_replies_file_checks_pilot_requests_or_paid_orders";
  }

  return {
    status: ["sale_ready_with_market_signal", "sale_ops_ready_traction_unmeasured"].includes(currentState) ? "pass" : "pending",
    currentState,
    nextGate,
    checks: {
      publicProofReady,
      checkoutReady,
      paidFileIntakeReady: !paidFileIntakeRequiresEmail || replyCaptureReady,
      outboundReady,
      realMarketSignal,
    },
    publicProof: {
      recordsAnalyzed: Number(publicProof.recordsAnalyzed ?? 0),
      pointOnlyOver4ha: Number(publicProof.pointOnlyOver4ha ?? 0),
      readyRecords: Number(publicProof.readyRecords ?? 0),
    },
    checkout: {
      stripeCleanupReady: Boolean(checkout.stripeCleanupReady),
      stripePilotReady: Boolean(checkout.stripePilotReady),
      offers: checkout.offers ?? {},
      paidFileIntakeRequiresEmail,
      contactEmail: checkout.contactEmail ?? DEFAULT_CONTACT_EMAIL,
      evidenceSource: checkout.evidenceSource ?? "supplied checks",
      errors: checkout.errors ?? [],
    },
    email: {
      ready: outboundReady,
      replyCaptureReady,
      checks: email.checks ?? {},
      replyCaptureChallenge: email.replyCaptureChallenge ?? null,
      replyCaptureEvidencePath: email.replyCaptureEvidencePath ?? DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH,
      replyCaptureChallengePath: email.replyCaptureChallengePath ?? DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH,
      replyCaptureEmlPath: email.replyCaptureEmlPath ?? DEFAULT_REPLY_CAPTURE_EML_PATH,
    },
    traction: {
      replies: Number(traction.replies ?? 0),
      fileChecks: Number(traction.fileChecks ?? 0),
      pilotRequests: Number(traction.pilotRequests ?? 0),
      paidOrders: Number(traction.paidOrders ?? 0),
    },
  };
}

export function renderSaleReadinessReport(report, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString().slice(0, 10);
  const contactEmail = report.checkout.contactEmail;

  return `# TraceReady sale-readiness report - ${generatedAt}

SALE_READINESS=${report.status} state=${report.currentState} next_gate=${report.nextGate}

## Gate Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Public problem proof | ${statusFor(report.checks.publicProofReady)} | ${formatNumber(report.publicProof.recordsAnalyzed)} rows analyzed; ${formatNumber(report.publicProof.pointOnlyOver4ha)} point-only plots over 4 hectares; ${formatNumber(report.publicProof.readyRecords)} ready records |
| Paid checkout availability | ${statusFor(report.checks.checkoutReady)} | cleanup=${statusFor(report.checkout.stripeCleanupReady)} pilot=${statusFor(report.checkout.stripePilotReady)}; source=${report.checkout.evidenceSource} |
${Object.entries(report.checkout.offers).map(([offer, evidence]) => `| ${offer} checkout evidence | ${statusFor(evidence.ready)} | rendered handoff=${statusFor(evidence.handoffReady)}; provider snapshot=${statusFor(evidence.providerReady)} |`).join("\n")}
| Paid file intake inbox | ${statusFor(report.checks.paidFileIntakeReady)} | ${
    report.checks.paidFileIntakeReady
      ? `${contactEmail} proven enough for paid-file intake`
      : `${contactEmail} not proven by reply-capture evidence`
  } |
| Outbound cleanup delivery auth | ${statusFor(report.checks.outboundReady)} | DMARC=${statusFor(report.email.checks.OUTREACH_EMAIL_DMARC)} DKIM=${statusFor(report.email.checks.OUTREACH_EMAIL_DKIM)} outbound=${statusFor(report.email.checks.OUTREACH_EMAIL_OUTBOUND_AUTH)} |
| Real market signal | ${statusFor(report.checks.realMarketSignal)} | replies=${report.traction.replies} file_checks=${report.traction.fileChecks} pilot_requests=${report.traction.pilotRequests} paid_orders=${report.traction.paidOrders} |

## Current Decision

${decisionText(report)}

${report.checkout.errors.length ? `Checkout evidence missing: ${report.checkout.errors.join("; ")}` : "The rendered handoff check proves the published scope-confirmation control and its configured destination."}
Provider activation evidence is a dated inspection of the rendered Stripe checkout, not a completed payment or a live transaction test. Both offers must pass for overall sale readiness; an individually ready offer can accept scoped orders while another remains unavailable.

${replyCaptureUnblockSection(report)}

## Next Gate

\`${report.nextGate}\`
`;
}

export function parseSaleReadinessArgs(argv) {
  const options = {
    publicAuditPath: DEFAULT_PUBLIC_AUDIT_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    replyCaptureEvidencePath: DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH,
    replyCaptureChallengePath: DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    siteDir: "out",
    approvalPath: DEFAULT_APPROVAL_PATH,
    generatedAt: new Date().toISOString().slice(0, 10),
    allowPending: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--allow-pending") {
      options.allowPending = true;
      continue;
    }

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--public-audit") {
      options.publicAuditPath = value;
    } else if (flag === "--results") {
      options.resultsPath = value;
    } else if (flag === "--reply-capture-evidence") {
      options.replyCaptureEvidencePath = value;
    } else if (flag === "--reply-capture-challenge") {
      options.replyCaptureChallengePath = value;
    } else if (flag === "--output") {
      options.outputPath = value;
    } else if (flag === "--site-dir") {
      options.siteDir = value;
    } else if (flag === "--approval") {
      options.approvalPath = value;
    } else if (flag === "--today") {
      options.generatedAt = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export async function buildSaleReadinessFromFiles(options = {}) {
  const publicAuditPath = options.publicAuditPath ?? DEFAULT_PUBLIC_AUDIT_PATH;
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const replyCaptureEvidencePath = options.replyCaptureEvidencePath ?? DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH;
  const replyCaptureChallengePath = options.replyCaptureChallengePath ?? DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH;
  const [publicAuditMarkdown, resultsCsv, checkout, emailReport, replyCaptureChallenge] = await Promise.all([
    fs.readFile(publicAuditPath, "utf8"),
    fs.readFile(resultsPath, "utf8"),
    inspectRenderedCheckout({ siteDir: options.siteDir, approvalPath: options.approvalPath }),
    inspectOutreachEmailDns({
      replyCaptureEvidencePath,
      ...(await pathExists(replyCaptureChallengePath) ? { replyCaptureChallengePath } : {}),
    }),
    loadJsonIfPresent(replyCaptureChallengePath),
  ]);
  const resultsSummary = summarizeOutreachResults(parseOutreachResults(resultsCsv));
  const publicProof = parsePublicProof(publicAuditMarkdown);
  const emailChecks = Object.fromEntries((emailReport.checks ?? []).map((check) => [check.label, check.ready]));

  return evaluateSaleReadiness({
    publicProof,
    checkout,
    email: {
      ready: emailReport.ready,
      replyCaptureReady: emailReport.replyCaptureReady,
      checks: emailChecks,
      replyCaptureChallenge,
      replyCaptureEvidencePath,
      replyCaptureChallengePath,
      replyCaptureEmlPath: DEFAULT_REPLY_CAPTURE_EML_PATH,
    },
    traction: resultsSummary,
  });
}

function replyCaptureUnblockSection(report) {
  if (report.currentState !== "sale_blocked_email_intake_unverified") {
    return "";
  }

  const contactEmail = report.checkout.contactEmail;
  const challenge = report.email.replyCaptureChallenge ?? {};
  const challengeSubject = String(challenge.subject ?? "").trim();
  const challengeToken = String(challenge.challengeToken ?? "").trim();
  const evidencePath = report.email.replyCaptureEvidencePath ?? DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH;
  const challengePath = report.email.replyCaptureChallengePath ?? DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH;
  const emlPath = report.email.replyCaptureEmlPath ?? DEFAULT_REPLY_CAPTURE_EML_PATH;

  return `## Reply-Capture Unblock

Send the current challenge to prove \`${contactEmail}\` reaches a controlled inbox.

${challengeSubject ? `Subject: \`${challengeSubject}\`` : `Challenge file: \`${challengePath}\``}
${challengeToken ? `Token: \`${challengeToken}\`` : ""}
Received message source: \`${emlPath}\`
The saved \`.eml\` must show \`${contactEmail}\` in \`To\`, \`Delivered-To\`, \`X-Original-To\`, \`Envelope-To\`, or another recipient/delivery header.
Manually typed timestamps are not enough for challenge-bound reply capture; use the saved \`.eml\` message source so TraceReady can verify the alias delivery headers.
Evidence output: \`${evidencePath}\`

\`\`\`powershell
npm run finalize:reply-capture
npm run record:reply-capture -- --output ${evidencePath} --contact ${contactEmail} --from-eml ${emlPath} --challenge ${challengePath} --confirm-controlled-inbox
\`\`\`
`;
}

function parsePublicProof(markdown) {
  return {
    recordsAnalyzed: extractCount(markdown, "Records analyzed"),
    pointOnlyOver4ha: extractCount(markdown, "Point-only plots over 4 hectares"),
    readyRecords: extractCount(markdown, "Ready records"),
  };
}

export function evaluateRenderedCheckout(html, { offer, contactEmail = DEFAULT_CONTACT_EMAIL } = {}) {
  const expected = typeof offer === "string" ? checkoutOffer(offer) : offer;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const errors = [];
  const fieldset = document.querySelector("fieldset[data-checkout-url]");
  if (document.querySelector("h1")?.textContent.trim() !== expected.title) errors.push("offer title is missing or incorrect");
  if (![...document.querySelectorAll("p")].some((element) => element.textContent.trim() === expected.price)) errors.push("offer price is missing or incorrect");
  if (!fieldset || fieldset.hasAttribute("disabled") || fieldset.getAttribute("data-checkout-url") !== expected.stripeHref) errors.push("enabled scope-confirmation checkout destination is missing or incorrect");
  if (!fieldset?.querySelector('input[type="checkbox"][required]:not([disabled])')) errors.push("required scope-confirmation checkbox is missing");
  if ([...document.querySelectorAll("a[href]")].some((element) => element.getAttribute("href") === expected.stripeHref)) errors.push("payment link appears before scope confirmation");
  if (![...document.querySelectorAll("a[href]")].some((element) => element.getAttribute("href") === "/order-intake/")) errors.push("order intake link is missing");
  if (![...document.querySelectorAll("a[href]")].some((element) => element.getAttribute("href").split("?")[0] === `mailto:${contactEmail}`)) errors.push("scope contact mailto is missing or incorrect");
  dom.window.close();
  return { ready: errors.length === 0, errors };
}

export function evaluateProviderEvidence(offer, evidence, { now = Date.now() } = {}) {
  const expected = checkoutOffer(offer);
  const errors = [];
  if (!evidence || evidence.active !== true) errors.push("provider checkout is not confirmed active");
  if (evidence?.href !== expected.stripeHref || evidence?.title !== expected.title || evidence?.amount !== Number(expected.price.slice(1)) * 100 || evidence?.currency !== "usd") errors.push("provider offer, price, currency, or destination does not match");
  if (evidence?.verificationMethod !== "rendered_stripe_checkout") errors.push("provider evidence must inspect rendered Stripe checkout; HTTP status is insufficient");
  const verifiedAt = Date.parse(evidence?.verifiedAt);
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 5 * 60_000 || now - verifiedAt > 30 * 24 * 60 * 60_000) errors.push("provider inspection timestamp must be within the last 30 days");
  return { ready: errors.length === 0, errors };
}

export async function inspectRenderedCheckout({ siteDir = "out", approvalPath = DEFAULT_APPROVAL_PATH, contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL, now = Date.now() } = {}) {
  const errors = [];
  async function readPage(relativePath) {
    try {
      return await fs.readFile(path.join(siteDir, relativePath), "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      errors.push(`missing built page ${path.join(siteDir, relativePath)}; run npm run build`);
      return "";
    }
  }
  const [cleanupHtml, pilotHtml, intakeHtml] = await Promise.all([
    readPage("checkout/cleanup/index.html"),
    readPage("checkout/pilot/index.html"),
    readPage("order-intake/index.html"),
  ]);
  const cleanup = evaluateRenderedCheckout(cleanupHtml, { offer: "cleanup", contactEmail });
  const pilot = evaluateRenderedCheckout(pilotHtml, { offer: "pilot", contactEmail });
  const approval = await loadJsonIfPresent(approvalPath);
  const cleanupProvider = evaluateProviderEvidence("cleanup", approval?.offers?.cleanup, { now });
  const pilotProvider = evaluateProviderEvidence("pilot", approval?.offers?.pilot, { now });
  const intakeDom = new JSDOM(intakeHtml);
  const intakeReady = [...intakeDom.window.document.querySelectorAll("a[href]")].some((element) => element.getAttribute("href").split("?")[0] === `mailto:${contactEmail}`);
  intakeDom.window.close();
  errors.push(...cleanup.errors.map((error) => `cleanup: ${error}`), ...pilot.errors.map((error) => `pilot: ${error}`));
  errors.push(...cleanupProvider.errors.map((error) => `cleanup provider: ${error}`), ...pilotProvider.errors.map((error) => `pilot provider: ${error}`));
  if (!intakeReady) errors.push("built order intake mailto is missing or incorrect");
  return {
    stripeCleanupReady: cleanup.ready && intakeReady && cleanupProvider.ready,
    stripePilotReady: pilot.ready && intakeReady && pilotProvider.ready,
    offers: {
      cleanup: { ready: cleanup.ready && intakeReady && cleanupProvider.ready, handoffReady: cleanup.ready && intakeReady, providerReady: cleanupProvider.ready },
      pilot: { ready: pilot.ready && intakeReady && pilotProvider.ready, handoffReady: pilot.ready && intakeReady, providerReady: pilotProvider.ready },
    },
    paidFileIntakeRequiresEmail: true,
    contactEmail,
    evidenceSource: path.resolve(siteDir),
    errors,
  };
}

function decisionText(report) {
  if (report.currentState === "sale_blocked_email_intake_unverified") {
    return "Do not treat Stripe checkout as sale-ready until the paid-file intake inbox is proven.";
  }

  if (report.currentState === "sale_intake_ready_outbound_auth_pending") {
    return "Paid files can reach the desk, but cleanup delivery and outreach still need authenticated outbound email.";
  }

  if (report.currentState === "sale_ops_ready_traction_unmeasured") {
    return "The sales path is operational and can accept scoped orders. Market traction is unmeasured until a reply, file check, pilot request, or paid order appears; traction is not a prerequisite for opening checkout.";
  }

  if (report.currentState === "sale_ready_with_market_signal") {
    return "Sale readiness has operational proof and at least one real market signal. The next job is fulfillment and permissioned case capture.";
  }

  return "The sale path is not ready; fix the next gate before counting this as an overcome market problem.";
}

function extractCount(markdown, label) {
  const match = markdown.match(new RegExp(`\\|\\s*${escapeRegExp(label)}\\s*\\|\\s*([\\d,]+)`, "i"));
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function statusFor(value) {
  return value ? "pass" : "pending";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function main() {
  const options = parseSaleReadinessArgs(process.argv.slice(2));
  const report = await buildSaleReadinessFromFiles(options);
  const markdown = renderSaleReadinessReport(report, { generatedAt: options.generatedAt });

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");
  process.stdout.write(markdown);
  process.stdout.write(`\nSALE_READINESS_REPORT=${options.outputPath}\n`);

  if (report.status !== "pass" && !options.allowPending) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`SALE_READINESS=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
