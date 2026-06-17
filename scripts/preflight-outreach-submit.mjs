import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { validateOutreachSendabilityAudit } from "./verify-outreach-sendability.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-02.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-02.csv";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-batch-02.json";
const DEFAULT_PRIVATE_DIR = "private";

const CONTACT_PROFILE = {
  firstName: "TraceReady",
  lastName: "Desk",
  workEmail: "founder@traceready.online",
  companyName: "Passive Print Labs LLC / TraceReady",
};

export function preflightOutreachSubmit({
  batchRows,
  resultRows,
  sendabilityAudit,
  sendReadyMarkdown,
  routeId,
  sendReadyPath,
  resultsPath = DEFAULT_RESULTS_PATH,
  emailReport = { ready: false },
  allowPendingReplyCapture = false,
}) {
  if (!routeId) {
    throw new Error("routeId is required");
  }

  const batchRow = batchRows.find((row) => row.route_id === routeId);
  const resultRow = resultRows.find((row) => row.route_id === routeId);
  const auditRoute = (sendabilityAudit.routes ?? []).find((row) => row.route_id === routeId);

  if (!batchRow) {
    throw new Error(`route ${routeId} is missing from the outreach batch ledger`);
  }

  if (!resultRow) {
    throw new Error(`route ${routeId} is missing from the outreach results ledger`);
  }

  if (!auditRoute) {
    throw new Error(`route ${routeId} is missing from the sendability audit`);
  }

  if (auditRoute.sendability !== "browser_form_ready") {
    throw new Error(`route ${routeId} is not browser_form_ready`);
  }

  if (auditRoute.requires_action_time_confirmation !== true) {
    throw new Error(`route ${routeId} must require action-time confirmation`);
  }

  if (resultRow.status !== "not_sent") {
    throw new Error(`route ${routeId} is already ${resultRow.status}`);
  }

  const normalizedSendReadyPath = normalizePath(sendReadyPath ?? `private/send-ready-${routeId}.md`);
  const companyName = auditRoute.company_or_channel ?? batchRow.company_or_channel;
  const publicRoute = auditRoute.route_url ?? batchRow.source_url;
  const confirmationLine = confirmationFor(routeId, companyName, normalizedSendReadyPath);

  if (!sendReadyMarkdown.includes(confirmationLine)) {
    throw new Error(`send-ready packet for ${routeId} is missing the exact action-time confirmation`);
  }

  if (!sendReadyMarkdown.includes(`Public route: ${publicRoute}`)) {
    throw new Error(`send-ready packet for ${routeId} is missing the verified public route`);
  }

  const replyCaptureReady = replyCaptureReadyFromEmailReport(emailReport);

  if (!replyCaptureReady && !allowPendingReplyCapture) {
    throw new Error(`reply capture must be verified before creating submit preflight for ${routeId}`);
  }

  return {
    routeId,
    companyName,
    publicRoute,
    contactMethod: auditRoute.contact_method,
    requiredFields: requiredFieldsFromNote(auditRoute.note),
    confirmationLine,
    sendReadyPath: normalizedSendReadyPath,
    resultsPath: normalizePath(resultsPath),
    resultStatus: resultRow.status,
    replyCapture: replyCaptureReady ? "ready" : "at_risk",
    emailReady: Boolean(emailReport.ready),
    auditDate: sendabilityAudit.auditDate,
  };
}

export function renderOutreachSubmitPreflight(preflight, options = {}) {
  const generatedAt = options.generatedAt ?? todayIsoDate();
  const submissionEvidenceCommand = [
    "npm run record:submission-evidence --",
    `--results ${preflight.resultsPath}`,
    `--route ${preflight.routeId}`,
    `--submitted-at ${generatedAt}T12:00:00.000Z`,
    `--success-url ${quoteForShell(preflight.publicRoute)}`,
    `--success-text ${quoteForShell("PASTE_VISIBLE_SUCCESS_TEXT")}`,
    `--output private/submission-evidence-${preflight.routeId}.json`,
    "--confirm-visible-success",
  ].join(" ");

  return `# TraceReady submit preflight: ${preflight.routeId}

OUTREACH_SUBMIT_PREFLIGHT=pass route=${preflight.routeId} company="${preflight.companyName}" reply_capture=${preflight.replyCapture}

Generated: ${generatedAt}

## Route

- Target: ${preflight.companyName}
- Public route: ${preflight.publicRoute}
- Contact method: ${preflight.contactMethod}
- Required fields: ${preflight.requiredFields || "verify visible required fields in browser before submission"}
- Send-ready packet: \`${preflight.sendReadyPath}\`
- Result ledger status: \`${preflight.resultStatus}\`
- Reply capture: \`${preflight.replyCapture}\`
${preflight.replyCapture === "ready" ? "" : "\nReply capture is `at_risk`; do not submit this route yet."}

## Exact Action-Time Confirmation

Do not submit until that exact confirmation has been given at action time.

\`\`\`text
${preflight.confirmationLine}
\`\`\`

## Browser Submit Checklist

- [ ] Open the public route above.
- [ ] Confirm the visible form still matches the send-ready packet field mapping.
- [ ] Copy the message from \`${preflight.sendReadyPath}\`.
- [ ] Leave marketing opt-in unchecked unless the user explicitly approves it.
- [ ] Submit once only after the exact confirmation above.
- [ ] Record the visible success state before logging the route as sent.

## Post-Send Logging

Only run this after visible browser success. If the form errors, do not mark sent; record the generic blocker in private notes.

\`\`\`bash
${submissionEvidenceCommand}
npm run summarize:outreach -- ${preflight.resultsPath}
npm run render:outreach-replies -- --results ${preflight.resultsPath} --route ${preflight.routeId} --output private/replies-${preflight.routeId}.md
\`\`\`
`;
}

export function preflightAllReadyOutreachSubmits({
  batchRows,
  resultRows,
  sendabilityAudit,
  sendReadyPackets,
  resultsPath = DEFAULT_RESULTS_PATH,
  emailReport = { ready: false },
  outputDir = DEFAULT_PRIVATE_DIR,
  sendReadyDir = DEFAULT_PRIVATE_DIR,
  allowPendingReplyCapture = false,
}) {
  const readyRoutes = (sendabilityAudit.routes ?? []).filter((route) => route.sendability === "browser_form_ready");
  const replyCaptureReady = replyCaptureReadyFromEmailReport(emailReport);
  const sendReadyEntries = readyRoutes.map((route) => {
    const sendReadyPath = normalizePath(`${sendReadyDir}/send-ready-${route.route_id}.md`);
    const sendReadyMarkdown = sendReadyPackets[sendReadyPath] ?? sendReadyPackets[route.route_id] ?? "";

    if (!sendReadyMarkdown.trim()) {
      throw new Error(`send-ready packet for ${route.route_id} is missing`);
    }

    return { route, sendReadyPath, sendReadyMarkdown };
  });

  if (!replyCaptureReady && !allowPendingReplyCapture) {
    throw new Error("reply capture must be verified before creating submit preflight queue");
  }

  const preflights = sendReadyEntries.map(({ route, sendReadyPath, sendReadyMarkdown }) => {
    return {
      ...preflightOutreachSubmit({
        batchRows,
        resultRows,
        sendabilityAudit,
        sendReadyMarkdown,
        routeId: route.route_id,
        sendReadyPath,
        resultsPath,
        emailReport,
        allowPendingReplyCapture,
      }),
      preflightPath: normalizePath(`${outputDir}/preflight-submit-${route.route_id}.md`),
    };
  });

  return {
    readyRoutes: readyRoutes.length,
    preflightReadyRoutes: preflights.length,
    replyCapture: replyCaptureReady ? "ready" : "at_risk",
    outputDir: normalizePath(outputDir),
    preflights,
  };
}

export function renderOutreachSubmitQueue(queue, options = {}) {
  const generatedAt = options.generatedAt ?? todayIsoDate();
  const tableRows = queue.preflights.map(
    (preflight) =>
      `| \`${preflight.routeId}\` | ${preflight.companyName} | ${preflight.publicRoute} | \`${preflight.sendReadyPath}\` | \`${preflight.preflightPath}\` | \`${preflight.replyCapture}\` |`,
  );
  const confirmations = queue.preflights.map((preflight) => preflight.confirmationLine);

  return `# TraceReady submit queue - ${generatedAt}

OUTREACH_SUBMIT_QUEUE=pass ready_routes=${queue.readyRoutes} preflight_ready=${queue.preflightReadyRoutes} reply_capture=${queue.replyCapture}

External browser-form submission still requires exact action-time confirmation for each route.
${queue.replyCapture === "ready" ? "" : "\nReply capture is not ready; keep these preflights held."}

## Ready Routes

| Route | Target | Public route | Send-ready packet | Submit preflight | Reply capture |
| --- | --- | --- | --- | --- | --- |
${tableRows.join("\n")}

## Action-Time Confirmations

\`\`\`text
${confirmations.join("\n")}
\`\`\`

## Measurement Rule

After submission, count only replies, routed browser/file checks, concrete referrals, pilot requests, paid cleanup orders, or permissioned de-identified before/after evidence as traction.
`;
}

export function parseOutreachSubmitPreflightArgs(argv) {
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    generatedAt: todayIsoDate(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (flag === "--skip-email") {
      parsed.skipEmail = true;
      continue;
    }

    if (flag === "--allow-pending-reply-capture") {
      parsed.allowPendingReplyCapture = true;
      continue;
    }

    if (flag === "--all-ready") {
      parsed.allReady = true;
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--batch") {
      parsed.batchPath = value;
    } else if (flag === "--results") {
      parsed.resultsPath = value;
    } else if (flag === "--sendability-audit") {
      parsed.sendabilityAuditPath = value;
    } else if (flag === "--reply-capture-evidence") {
      parsed.replyCaptureEvidencePath = value;
    } else if (flag === "--reply-capture-challenge") {
      parsed.replyCaptureChallengePath = value;
    } else if (flag === "--send-ready") {
      parsed.sendReadyPath = value;
    } else if (flag === "--route") {
      parsed.routeId = value;
      parsed.sendReadyPath ??= `private/send-ready-${value}.md`;
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else if (flag === "--output-dir") {
      parsed.outputDir = value;
    } else if (flag === "--queue-output") {
      parsed.queueOutputPath = value;
    } else if (flag === "--today") {
      parsed.generatedAt = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!parsed.routeId && !parsed.allReady) {
    throw new Error("--route requires a value");
  }

  if (parsed.routeId) {
    parsed.sendReadyPath ??= `private/send-ready-${parsed.routeId}.md`;
    parsed.outputPath ??= `private/preflight-submit-${parsed.routeId}.md`;
  }

  if (parsed.allReady) {
    parsed.outputDir ??= DEFAULT_PRIVATE_DIR;
    parsed.queueOutputPath ??= `${parsed.outputDir}/preflight-submit-queue.md`;
  }

  return parsed;
}

function confirmationFor(routeId, companyName, sendReadyPath) {
  return `Confirm: submit ${routeId} to ${companyName} using ${CONTACT_PROFILE.firstName} ${CONTACT_PROFILE.lastName}, ${CONTACT_PROFILE.workEmail}, ${CONTACT_PROFILE.companyName}, and the message in ${sendReadyPath}.`;
}

function requiredFieldsFromNote(note = "") {
  const match = note.match(/required fields are ([^.]+)/i);
  return match ? match[1].trim() : "";
}

function normalizePath(filePath) {
  return String(filePath ?? "").replace(/\\/g, "/");
}

function replyCaptureReadyFromEmailReport(emailReport = {}) {
  if (emailReport.ready || emailReport.replyCaptureReady) {
    return true;
  }

  const checks = Object.fromEntries((emailReport.checks ?? []).map((check) => [check.label, check.ready]));

  return Boolean(checks.OUTREACH_EMAIL_MX && checks.OUTREACH_EMAIL_ALIAS_TEST);
}

function quoteForShell(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const options = parseOutreachSubmitPreflightArgs(process.argv.slice(2));
  const [batchCsv, resultsCsv, sendabilityAuditJson] = await Promise.all([
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
    fs.readFile(options.sendabilityAuditPath, "utf8"),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const sendabilityAudit = JSON.parse(sendabilityAuditJson);
  const errors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachSendabilityAudit(sendabilityAudit, batchRows, resultRows),
  ];

  if (errors.length > 0) {
    for (const error of [...new Set(errors)]) {
      console.error(`OUTREACH_SUBMIT_PREFLIGHT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const emailReport = options.skipEmail
    ? { ready: false }
    : await inspectOutreachEmailDns({
        replyCaptureEvidencePath: options.replyCaptureEvidencePath,
        replyCaptureChallengePath: options.replyCaptureChallengePath,
      });

  if (options.allReady) {
    const readyRoutes = (sendabilityAudit.routes ?? []).filter((route) => route.sendability === "browser_form_ready");
    const sendReadyPackets = Object.fromEntries(
      await Promise.all(
        readyRoutes.map(async (route) => {
          const packetPath = normalizePath(`private/send-ready-${route.route_id}.md`);
          return [packetPath, await fs.readFile(packetPath, "utf8")];
        }),
      ),
    );
    const queue = preflightAllReadyOutreachSubmits({
      batchRows,
      resultRows,
      sendabilityAudit,
      sendReadyPackets,
      resultsPath: options.resultsPath,
      emailReport,
      outputDir: options.outputDir,
      allowPendingReplyCapture: options.allowPendingReplyCapture,
    });

    await fs.mkdir(options.outputDir, { recursive: true });

    for (const preflight of queue.preflights) {
      const markdown = renderOutreachSubmitPreflight(preflight, { generatedAt: options.generatedAt });
      await fs.writeFile(preflight.preflightPath, markdown, "utf8");
    }

    const queueMarkdown = renderOutreachSubmitQueue(queue, { generatedAt: options.generatedAt });
    await fs.writeFile(options.queueOutputPath, queueMarkdown, "utf8");

    console.log(
      `OUTREACH_SUBMIT_QUEUE=pass ready_routes=${queue.readyRoutes} preflight_ready=${queue.preflightReadyRoutes} reply_capture=${queue.replyCapture} output=${options.queueOutputPath}`,
    );
    return;
  }

  const sendReadyMarkdown = await fs.readFile(options.sendReadyPath, "utf8");
  const preflight = preflightOutreachSubmit({
    batchRows,
    resultRows,
    sendabilityAudit,
    sendReadyMarkdown,
    routeId: options.routeId,
    sendReadyPath: options.sendReadyPath,
    resultsPath: options.resultsPath,
    emailReport,
    allowPendingReplyCapture: options.allowPendingReplyCapture,
  });
  const markdown = renderOutreachSubmitPreflight(preflight, { generatedAt: options.generatedAt });

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");

  console.log(
    `OUTREACH_SUBMIT_PREFLIGHT=pass route=${preflight.routeId} company="${preflight.companyName}" reply_capture=${preflight.replyCapture} output=${options.outputPath}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_SUBMIT_PREFLIGHT=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
