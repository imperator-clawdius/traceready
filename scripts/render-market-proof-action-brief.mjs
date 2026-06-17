import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { validateOutreachSendabilityAudit } from "./verify-outreach-sendability.mjs";
import {
  loadLiveSubmitReport,
  loadSendReadyPackets,
  loadSubmitPreflightPackets,
  scoreTractionReadiness,
} from "./score-traction-readiness.mjs";

const DEFAULT_PUBLIC_AUDIT_PATH = "docs/public-dataset-mini-audit.md";
const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-02.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-02.csv";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-batch-02.json";
const DEFAULT_CONTACT_RECON_PATH = "private/outreach-contact-recon-batch-02.json";
const DEFAULT_LIVE_SUBMIT_REPORT_PATH = "private/submit-route-live-check.md";
const DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH = "private/reply-capture-challenge.json";
const DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH = "private/reply-capture-evidence.json";
const DEFAULT_OUTPUT_PATH = "private/market-proof-action-brief.md";
const DEFAULT_PREFLIGHT_QUEUE_PATH = "private/preflight-submit-queue.md";

export function parseMarketProofActionBriefArgs(argv) {
  const options = {
    publicAuditPath: DEFAULT_PUBLIC_AUDIT_PATH,
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    contactReconPath: DEFAULT_CONTACT_RECON_PATH,
    liveSubmitReportPath: DEFAULT_LIVE_SUBMIT_REPORT_PATH,
    replyCaptureChallengePath: DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH,
    replyCaptureEvidencePath: DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    preflightQueuePath: DEFAULT_PREFLIGHT_QUEUE_PATH,
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (flag === "--skip-email") {
      options.skipEmail = true;
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--public-audit") {
      options.publicAuditPath = value;
    } else if (flag === "--batch") {
      options.batchPath = value;
    } else if (flag === "--results") {
      options.resultsPath = value;
    } else if (flag === "--sendability-audit") {
      options.sendabilityAuditPath = value;
    } else if (flag === "--contact-recon") {
      options.contactReconPath = value;
    } else if (flag === "--live-submit-report") {
      options.liveSubmitReportPath = value;
    } else if (flag === "--reply-capture-challenge") {
      options.replyCaptureChallengePath = value;
    } else if (flag === "--reply-capture-evidence") {
      options.replyCaptureEvidencePath = value;
    } else if (flag === "--preflight-queue") {
      options.preflightQueuePath = value;
    } else if (flag === "--output") {
      options.outputPath = value;
    } else if (flag === "--today") {
      options.generatedAt = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export function renderMarketProofActionBrief(score, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString().slice(0, 10);
  const replyCaptureChallenge = options.replyCaptureChallenge ?? null;
  const preflightQueuePath = options.preflightQueuePath ?? DEFAULT_PREFLIGHT_QUEUE_PATH;
  const routeLines = score.outreach.readyRoutes.length
    ? score.outreach.readyRoutes.map(
        (route) =>
          `| \`${route.route_id}\` | ${route.company_or_channel} | ${route.route_url} | \`private/send-ready-${route.route_id}.md\` |`,
      )
    : ["| none | none | none | none |"];
  const confirmationLines = score.outreach.readyRoutes.map(
    (route) =>
      `Confirm: submit ${route.route_id} to ${route.company_or_channel} using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-${route.route_id}.md.`,
  );
  const challengeSubject = String(replyCaptureChallenge?.subject ?? "").trim();
  const challengeBody = String(replyCaptureChallenge?.body ?? "").trim();
  const replyCaptureReady = Boolean(score.email.replyCaptureReady);

  return `# TraceReady market-proof action brief - ${generatedAt}

## Status

Current state: \`${score.currentState}\`

Next gate: \`${score.nextGate}\`

This is public problem proof, not customer traction.

## Quantified Problem

- ${formatNumber(score.publicProof.recordsAnalyzed)} public rows analyzed.
- ${formatNumber(score.publicProof.pointOnlyOver4ha)} point-only plots over 4 hectares.
- ${formatNumber(score.publicProof.missingPlotIds)} rows without plot IDs.
- ${formatNumber(score.publicProof.missingSupplierIdentity)} rows without supplier identity.
- ${formatNumber(score.publicProof.readyRecords)} ready records.
- Readiness score: ${score.publicProof.readinessScore || "unknown"}.

## Traction Counters

| Metric | Count |
| --- | ---: |
| Manually verified browser-form-ready routes | ${score.outreach.readyBrowserFormRoutes} |
| Send-ready packets | ${score.outreach.packetReadyRoutes ?? "not checked"} |
| Submit preflights ready | ${score.outreach.submitPreflightReadyRoutes ?? "not checked"} |
| Live submit routes checked | ${score.outreach.liveSubmitCheckedRoutes ?? "not checked"} |
| Live submit route report status | ${score.outreach.liveSubmitStatus ?? "not checked"} |
| Live submit routes ready | ${score.outreach.liveSubmitReadyRoutes ?? "not checked"} |
| Live submit routes held by reply capture | ${(score.outreach.liveSubmitReplyCaptureHeldRoutes ?? []).length} |
| External submissions completed | ${score.outreach.sentOrBeyond} |
| Replies | ${score.outreach.replies} |
| Browser/file checks | ${score.outreach.fileChecks} |
| Pilot requests | ${score.outreach.pilotRequests} |
| Paid cleanup orders | ${score.outreach.paidOrders} |

## Do This Now

${replyCaptureReady ? renderReadyNextAction(preflightQueuePath) : renderReplyCaptureNextAction({ challengeSubject, challengeBody })}

## Ready Route Queue

| Route | Target | Public route | Packet |
| --- | --- | --- | --- |
${routeLines.join("\n")}

## Action-Time Confirmations

External form submission still requires explicit user confirmation at action time.

After a form shows success, record it with \`npm run record:submission-evidence\`.

Example:

\`\`\`powershell
npm run record:submission-evidence -- --results private/outreach-results-batch-02.csv --route b02-r03 --submitted-at ${generatedAt}T12:00:00.000Z --success-url "https://example.com/contact" --success-text "Thank you for your message" --output private/submission-evidence-b02-r03.json --confirm-visible-success
\`\`\`

\`\`\`text
${confirmationLines.join("\n")}
\`\`\`

## Measurement Rule

Count only replies, routed browser/file checks, concrete referrals, pilot requests, paid cleanup orders, or permissioned de-identified before/after evidence as traction.

Do not count prepared routes, submitted messages, likes, compliments, or vague interest as traction.
`;
}

export async function renderMarketProofActionBriefFromFiles(options = {}) {
  const [publicAuditMarkdown, batchCsv, resultsCsv, sendabilityAuditJson, contactReconJson] = await Promise.all([
    fs.readFile(options.publicAuditPath ?? DEFAULT_PUBLIC_AUDIT_PATH, "utf8"),
    fs.readFile(options.batchPath ?? DEFAULT_BATCH_PATH, "utf8"),
    fs.readFile(options.resultsPath ?? DEFAULT_RESULTS_PATH, "utf8"),
    fs.readFile(options.sendabilityAuditPath ?? DEFAULT_SENDABILITY_AUDIT_PATH, "utf8"),
    fs.readFile(options.contactReconPath ?? DEFAULT_CONTACT_RECON_PATH, "utf8").catch(() => "{}"),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const sendabilityAudit = JSON.parse(sendabilityAuditJson);
  const contactRecon = JSON.parse(contactReconJson);
  const validationErrors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachSendabilityAudit(sendabilityAudit, batchRows, resultRows),
  ];

  if (validationErrors.length > 0) {
    throw new Error([...new Set(validationErrors)].join("; "));
  }

  const readyRoutesForPackets = (sendabilityAudit.routes ?? [])
    .filter((route) => route.sendability === "browser_form_ready")
    .map((route) => ({
      route_id: route.route_id,
      company_or_channel:
        route.company_or_channel ?? batchRows.find((row) => row.route_id === route.route_id)?.company_or_channel ?? route.route_id,
      route_url: route.route_url,
    }));
  const [emailReport, sendReadyPackets, submitPreflightPackets, liveSubmitReport, replyCaptureChallenge] =
    await Promise.all([
      loadEmailReport(options),
      loadSendReadyPackets(readyRoutesForPackets),
      loadSubmitPreflightPackets(readyRoutesForPackets),
      loadLiveSubmitReport(options.liveSubmitReportPath ?? DEFAULT_LIVE_SUBMIT_REPORT_PATH),
      loadJsonIfPresent(options.replyCaptureChallengePath ?? DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH),
    ]);
  const score = scoreTractionReadiness({
    publicAuditMarkdown,
    batchRows,
    resultRows,
    sendabilityAudit,
    contactRecon,
    emailReport,
    sendReadyPackets,
    submitPreflightPackets,
    liveSubmitReport,
  });
  const markdown = renderMarketProofActionBrief(score, {
    generatedAt: options.generatedAt,
    preflightQueuePath: options.preflightQueuePath,
    replyCaptureChallenge,
  });

  return {
    score,
    markdown,
    replyCaptureChallenge,
  };
}

async function loadEmailReport(options = {}) {
  if (options.skipEmail) {
    return { ready: false, dnsReady: false, checks: [] };
  }

  return inspectOutreachEmailDns({
    replyCaptureEvidencePath: options.replyCaptureEvidencePath ?? DEFAULT_REPLY_CAPTURE_EVIDENCE_PATH,
    replyCaptureChallengePath: options.replyCaptureChallengePath ?? DEFAULT_REPLY_CAPTURE_CHALLENGE_PATH,
  });
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

function renderReplyCaptureNextAction({ challengeSubject, challengeBody }) {
  return [
    "Reply capture is not proven yet.",
    "",
    "1. Send the reply-capture challenge from a separate mailbox.",
    "2. Save the received message source as `private/reply-capture-received.eml`.",
    "3. Run `npm run finalize:reply-capture`.",
    "4. Do not submit external forms until reply capture passes and action-time confirmation is explicit.",
    "",
    challengeSubject ? `Subject: \`${challengeSubject}\`` : "Subject: rerun `npm run prepare:reply-capture` to generate one.",
    "",
    challengeBody
      ? ["```text", challengeBody, "```"].join("\n")
      : "Challenge body: rerun `npm run prepare:reply-capture` to generate one.",
  ].join("\n");
}

function renderReadyNextAction(preflightQueuePath) {
  return [
    "Reply capture is proven.",
    "",
    `Use \`${preflightQueuePath}\` for the next action-time confirmation.`,
    "Record visible form success evidence before counting any route as sent.",
  ].join("\n");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

async function main() {
  const options = parseMarketProofActionBriefArgs(process.argv.slice(2));
  const result = await renderMarketProofActionBriefFromFiles(options);

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, result.markdown, "utf8");
  console.log(
    [
      "MARKET_PROOF_ACTION_BRIEF=pass",
      `state=${result.score.currentState}`,
      `next_gate=${result.score.nextGate}`,
      `reply_capture_ready=${result.score.email.replyCaptureReady}`,
      `sent=${result.score.outreach.sentOrBeyond}`,
      `replies=${result.score.outreach.replies}`,
      `paid_orders=${result.score.outreach.paidOrders}`,
      `output=${options.outputPath}`,
    ].join(" "),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`MARKET_PROOF_ACTION_BRIEF=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
