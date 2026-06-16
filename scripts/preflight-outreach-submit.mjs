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
    replyCapture: emailReport.ready ? "ready" : "at_risk",
    emailReady: Boolean(emailReport.ready),
    auditDate: sendabilityAudit.auditDate,
  };
}

export function renderOutreachSubmitPreflight(preflight, options = {}) {
  const generatedAt = options.generatedAt ?? todayIsoDate();
  const updateCommand = [
    "npm run update:outreach-result --",
    `--results ${preflight.resultsPath}`,
    `--route ${preflight.routeId}`,
    `--date-sent ${generatedAt}`,
    "--status sent",
    "--response-type none",
    `--notes ${quoteIfNeeded(`sent via ${preflight.companyName} public contact form; visible form success observed`)}`,
    `--next-action ${quoteIfNeeded("follow up in 4 business days")}`,
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
${updateCommand}
npm run summarize:outreach -- ${preflight.resultsPath}
npm run render:outreach-replies -- --results ${preflight.resultsPath} --route ${preflight.routeId} --output private/replies-${preflight.routeId}.md
\`\`\`
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

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--batch") {
      parsed.batchPath = value;
    } else if (flag === "--results") {
      parsed.resultsPath = value;
    } else if (flag === "--sendability-audit") {
      parsed.sendabilityAuditPath = value;
    } else if (flag === "--send-ready") {
      parsed.sendReadyPath = value;
    } else if (flag === "--route") {
      parsed.routeId = value;
      parsed.sendReadyPath ??= `private/send-ready-${value}.md`;
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else if (flag === "--today") {
      parsed.generatedAt = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!parsed.routeId) {
    throw new Error("--route requires a value");
  }

  parsed.sendReadyPath ??= `private/send-ready-${parsed.routeId}.md`;
  parsed.outputPath ??= `private/preflight-submit-${parsed.routeId}.md`;

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

function quoteIfNeeded(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const options = parseOutreachSubmitPreflightArgs(process.argv.slice(2));
  const [batchCsv, resultsCsv, sendabilityAuditJson, sendReadyMarkdown] = await Promise.all([
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
    fs.readFile(options.sendabilityAuditPath, "utf8"),
    fs.readFile(options.sendReadyPath, "utf8"),
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

  const emailReport = options.skipEmail ? { ready: false } : await inspectOutreachEmailDns();
  const preflight = preflightOutreachSubmit({
    batchRows,
    resultRows,
    sendabilityAudit,
    sendReadyMarkdown,
    routeId: options.routeId,
    sendReadyPath: options.sendReadyPath,
    resultsPath: options.resultsPath,
    emailReport,
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
