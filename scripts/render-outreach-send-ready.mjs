import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bodyFor, subjectFor } from "./render-outreach-pack.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-01.csv";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-importer.json";
const DEFAULT_CONTACT_PROFILE = {
  firstName: "TraceReady",
  lastName: "Desk",
  workEmail: "founder@traceready.online",
  companyName: "Passive Print Labs LLC / TraceReady",
};

export function renderOutreachSendReadyPacket(batchRows, resultRows, sendabilityAudit, options = {}) {
  const routeId = requiredOption(options.routeId, "routeId");
  const today = options.today ?? todayIsoDate();
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const outputPath = options.outputPath ?? `private/send-ready-${routeId}.md`;
  const contactProfile = {
    ...DEFAULT_CONTACT_PROFILE,
    ...(options.contactProfile ?? {}),
  };
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

  if (resultRow.status !== "not_sent") {
    throw new Error(`route ${routeId} is already ${resultRow.status}`);
  }

  const subject = subjectFor(batchRow);
  const body = bodyFor(batchRow);
  const publicRoute = auditRoute.route_url ?? batchRow.source_url;
  const requiredFields = requiredFieldsFromNote(auditRoute.note);
  const messageFile = normalizedPrivatePath(outputPath);
  const confirmationLine = `Confirm: submit ${routeId} to ${batchRow.company_or_channel} using ${contactProfile.firstName} ${contactProfile.lastName}, ${contactProfile.workEmail}, ${contactProfile.companyName}, and the message in ${messageFile}.`;

  return [
    `# TraceReady send-ready packet: ${routeId}`,
    "",
    `Route: \`${routeId}\``,
    `Target: ${batchRow.company_or_channel}`,
    `Public route: ${publicRoute}`,
    ...(auditRoute.public_inbox ? [`Verified company-level inbox: \`${auditRoute.public_inbox}\``] : []),
    `Inspection date: ${sendabilityAudit.auditDate ?? today}`,
    "",
    "## Route Decision",
    "",
    "This route is browser-form-ready in the private sendability audit.",
    "",
    `- Company-level public route: ${publicRoute}`,
    `- Contact method: ${auditRoute.contact_method ?? "public_browser_form"}`,
    ...(requiredFields ? [`- Required fields: ${requiredFields}`] : []),
    ...(auditRoute.note ? [`- Audit note: ${auditRoute.note}`] : []),
    "- Submit once. Do not send duplicates from multiple channels on the same day.",
    "",
    "## Action-Time Confirmation",
    "",
    "Do not type into the form or submit until explicit action-time confirmation.",
    "",
    "```text",
    confirmationLine,
    "```",
    "",
    "## Reply-Risk Note",
    "",
    "Before using the domain inbox as the work email, run `npm run verify:outreach-email`. If DMARC, DKIM, outbound auth, or alias delivery are still pending, replies may be missed or filtered.",
    "",
    "## Form Field Mapping",
    "",
    `- First name: \`${contactProfile.firstName}\``,
    `- Last name: \`${contactProfile.lastName}\``,
    `- Work email: \`${contactProfile.workEmail}\``,
    "- Work phone: leave blank",
    `- Registered Company Name: \`${contactProfile.companyName}\``,
    `- Subject: \`${subject}\``,
    `- Your Message: copy from \`${messageFile}\``,
    "- Honeypot / company website: leave blank",
    "- Privacy acceptance: check only immediately before submission",
    "",
    "## Message",
    "",
    body,
    "",
    "## Post-Send Logging",
    "",
    "Only run this after visible browser success. If the form errors, do not mark sent; record the generic blocker in private notes.",
    "",
    "```bash",
    updateCommand(resultsPath, routeId, today, batchRow.company_or_channel),
    "```",
    "",
    "Then render summary and reply handling:",
    "",
    "```bash",
    `npm run summarize:outreach -- ${resultsPath}`,
    `npm run render:outreach-replies -- --results ${resultsPath} --route ${routeId} --output private/replies-${routeId}.md`,
    "```",
    "",
  ].join("\n");
}

export function parseOutreachSendReadyArgs(argv) {
  const args = [...argv];
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    today: todayIsoDate(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
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
    } else if (flag === "--route") {
      parsed.routeId = value;
      parsed.outputPath ??= `private/send-ready-${value}.md`;
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else if (flag === "--today") {
      parsed.today = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!parsed.routeId) {
    throw new Error("--route requires a value");
  }

  parsed.outputPath ??= `private/send-ready-${parsed.routeId}.md`;
  return parsed;
}

function requiredOption(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function requiredFieldsFromNote(note = "") {
  const match = note.match(/required fields are ([^.]+)/i);
  return match ? match[1].trim() : "";
}

function normalizedPrivatePath(outputPath) {
  return outputPath.replace(/\\/g, "/");
}

function updateCommand(resultsPath, routeId, today, companyName) {
  return [
    "npm run update:outreach-result --",
    `--results ${resultsPath}`,
    `--route ${routeId}`,
    `--date-sent ${today}`,
    "--status sent",
    "--response-type none",
    `--notes ${quoteIfNeeded(`sent via ${companyName} public contact form; visible form success observed`)}`,
    `--next-action ${quoteIfNeeded("follow up in 4 business days")}`,
  ].join(" ");
}

function quoteIfNeeded(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const options = parseOutreachSendReadyArgs(process.argv.slice(2));
  const [batchCsv, resultsCsv, sendabilityAuditJson] = await Promise.all([
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
    fs.readFile(options.sendabilityAuditPath, "utf8"),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const sendabilityAudit = JSON.parse(sendabilityAuditJson);
  const errors = [...validateOutreachLedger(batchRows), ...validateOutreachResults(resultRows)];

  if (errors.length > 0) {
    for (const error of [...new Set(errors)]) {
      console.error(`OUTREACH_SEND_READY=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = `${renderOutreachSendReadyPacket(batchRows, resultRows, sendabilityAudit, options)}\n`;
  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");
  console.log(`OUTREACH_SEND_READY=pass route=${options.routeId} path=${options.outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_SEND_READY=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
