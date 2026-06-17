import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { validateOutreachSendabilityAudit } from "./verify-outreach-sendability.mjs";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-02.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-02.csv";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-batch-02.json";
const DEFAULT_CHALLENGE_PATH = "private/reply-capture-challenge.json";
const DEFAULT_EVIDENCE_PATH = "private/reply-capture-evidence.json";
const DEFAULT_EML_PATH = "private/reply-capture-received.eml";
const DEFAULT_OUTPUT_PATH = "private/reply-capture-unblock.md";
const DEFAULT_PREFLIGHT_QUEUE_PATH = "private/preflight-submit-queue.md";
const CONTACT_EMAIL = "founder@traceready.online";

export function parseReplyCaptureUnblockArgs(argv) {
  const options = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    challengePath: DEFAULT_CHALLENGE_PATH,
    evidencePath: DEFAULT_EVIDENCE_PATH,
    emlPath: DEFAULT_EML_PATH,
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

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--batch") {
      options.batchPath = value;
    } else if (flag === "--results") {
      options.resultsPath = value;
    } else if (flag === "--sendability-audit") {
      options.sendabilityAuditPath = value;
    } else if (flag === "--challenge") {
      options.challengePath = value;
    } else if (flag === "--evidence") {
      options.evidencePath = value;
    } else if (flag === "--eml") {
      options.emlPath = value;
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

export function buildReplyCaptureUnblockPacket({
  challenge = null,
  readyRoutes = [],
  evidenceExists = false,
  emlExists = false,
  emailReport = {},
  evidencePath = DEFAULT_EVIDENCE_PATH,
  challengePath = DEFAULT_CHALLENGE_PATH,
  emlPath = DEFAULT_EML_PATH,
  preflightQueuePath = DEFAULT_PREFLIGHT_QUEUE_PATH,
} = {}) {
  const replyCaptureReady = Boolean(emailReport.replyCaptureReady);
  const status = replyCaptureReady ? "ready" : emlExists ? "eml_saved_finalize_next" : "waiting_for_inbox_receipt";
  const emailChecks = Array.isArray(emailReport.checks) ? emailReport.checks : [];

  return {
    status,
    replyCaptureReady,
    emailReady: Boolean(emailReport.ready),
    emailChecks,
    evidenceExists,
    emlExists,
    challenge,
    readyRoutes,
    evidencePath,
    challengePath,
    emlPath,
    preflightQueuePath,
  };
}

export function renderReplyCaptureUnblockPacket(packet, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString().slice(0, 10);
  const challengeSubject = String(packet.challenge?.subject ?? "").trim();
  const challengeBody = String(packet.challenge?.body ?? "").trim();
  const routeRows = packet.readyRoutes.length
    ? packet.readyRoutes.map(
        (route) =>
          `| \`${route.route_id}\` | ${route.company_or_channel} | ${route.route_url} | \`private/send-ready-${route.route_id}.md\` |`,
      )
    : ["| none | none | none | none |"];

  return `${[
    `# TraceReady reply-capture unblock - ${generatedAt}`,
    "",
    "## Gate",
    "",
    `REPLY_CAPTURE_UNBLOCK=${packet.replyCaptureReady ? "pass" : "pending"} status=${packet.status}`,
    `Reply capture ready: ${packet.replyCaptureReady ? "yes" : "no"}`,
    `Email ready: ${packet.emailReady ? "yes" : "no"}`,
    `Challenge: \`${packet.challengePath}\`${challengeSubject ? ` subject=\`${challengeSubject}\`` : ""}`,
    `Received message source: \`${packet.emlPath}\` ${packet.emlExists ? "(found)" : "(missing)"}`,
    `Evidence: \`${packet.evidencePath}\` ${packet.evidenceExists ? "(found)" : "(missing)"}`,
    "",
    "## Email Risk Snapshot",
    "",
    ...(packet.emailChecks?.length
      ? [
          "| Check | Status | Detail |",
          "| --- | --- | --- |",
          ...packet.emailChecks.map(
            (check) => `| ${check.label} | ${check.ready ? "pass" : "pending"} | ${escapeTableCell(check.detail)} |`,
          ),
          "",
        ]
      : ["No email DNS check details were available.", ""]),
    packet.replyCaptureReady
      ? "Reply capture is proven. DMARC, DKIM, and outbound sender auth may still need cleanup before measuring email non-response."
      : "Reply capture is the submission gate. DMARC, DKIM, and outbound sender auth are delivery/reputation work; do not measure non-response until reply capture is proven.",
    "",
    "DNS starter still needed unless already configured:",
    "",
    "- Keep SPF forwarding include: `v=spf1 include:spf.efwd.registrar-servers.com ~all`.",
    `- Add TXT \`_dmarc\`: \`v=DMARC1; p=none; rua=mailto:${CONTACT_EMAIL}; adkim=r; aspf=r\`.`,
    "- Add DKIM TXT/CNAME records from the outbound mail provider once that sender is chosen.",
    "",
    "## One Action To Unblock Submissions",
    "",
    packet.replyCaptureReady
      ? `Reply capture is proven. Use \`${packet.preflightQueuePath}\` for action-time confirmations.`
      : packet.emlExists
        ? "The received `.eml` is saved. Run the finalizer now to record evidence, refresh the scorecard, and regenerate submit preflights."
        : "Send this challenge from a separate mailbox to prove `founder@traceready.online` reaches a controlled inbox.",
    "",
    challengeSubject ? `To: \`${CONTACT_EMAIL}\`` : "Challenge not found; regenerate it before sending.",
    challengeSubject ? `Subject: \`${challengeSubject}\`` : "`npm run prepare:reply-capture -- --output private/reply-capture-challenge.json --contact founder@traceready.online --handoff-output private/reply-capture-handoff.md --email-draft-output private/reply-capture-email.eml`",
    "",
    ...(challengeBody ? ["```text", challengeBody, "```", ""] : []),
    "After the message arrives, save the received message source as `private/reply-capture-received.eml`.",
    "",
    "Then run:",
    "",
    "```powershell",
    "npm run finalize:reply-capture",
    "npm run render:outreach-email-runbook",
    `npm run score:traction -- --reply-capture-evidence ${packet.evidencePath} --reply-capture-challenge ${packet.challengePath}`,
    `npm run preflight:outreach-submit -- --all-ready --reply-capture-evidence ${packet.evidencePath} --reply-capture-challenge ${packet.challengePath} --output-dir private --queue-output ${packet.preflightQueuePath}`,
    "```",
    "",
    "## Routes Waiting Behind This Gate",
    "",
    "| Route | Target | Public route | Send-ready packet |",
    "| --- | --- | --- | --- |",
    routeRows.join("\n"),
    "",
    "## Boundary",
    "",
    "Do not submit external forms, mark routes sent, or measure non-response until reply capture is proven and the user gives exact action-time confirmation for each route.",
  ].join("\n")}\n`;
}

function escapeTableCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

export async function renderReplyCaptureUnblockFromFiles(options = {}) {
  const batchPath = options.batchPath ?? DEFAULT_BATCH_PATH;
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const sendabilityAuditPath = options.sendabilityAuditPath ?? DEFAULT_SENDABILITY_AUDIT_PATH;
  const challengePath = options.challengePath ?? DEFAULT_CHALLENGE_PATH;
  const evidencePath = options.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const emlPath = options.emlPath ?? DEFAULT_EML_PATH;
  const preflightQueuePath = options.preflightQueuePath ?? DEFAULT_PREFLIGHT_QUEUE_PATH;
  const [batchCsv, resultsCsv, sendabilityAuditJson, challenge, evidenceExists, emlExists] =
    await Promise.all([
      fs.readFile(batchPath, "utf8"),
      fs.readFile(resultsPath, "utf8"),
      fs.readFile(sendabilityAuditPath, "utf8"),
      loadJsonIfPresent(challengePath),
      pathExists(evidencePath),
      pathExists(emlPath),
    ]);
  const emailReport = await inspectOutreachEmailDns({
    replyCaptureEvidencePath: evidencePath,
    ...(challenge ? { replyCaptureChallengePath: challengePath } : {}),
  });
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const sendabilityAudit = JSON.parse(sendabilityAuditJson);
  const validationErrors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachSendabilityAudit(sendabilityAudit, batchRows, resultRows),
  ];

  if (validationErrors.length > 0) {
    throw new Error([...new Set(validationErrors)].join("; "));
  }

  const readyRoutes = (sendabilityAudit.routes ?? [])
    .filter((route) => route.sendability === "browser_form_ready")
    .map((route) => ({
      route_id: route.route_id,
      company_or_channel:
        route.company_or_channel ?? batchRows.find((row) => row.route_id === route.route_id)?.company_or_channel ?? route.route_id,
      route_url: route.route_url,
    }));
  const packet = buildReplyCaptureUnblockPacket({
    challenge,
    readyRoutes,
    evidenceExists,
    emlExists,
    emailReport,
    evidencePath,
    challengePath,
    emlPath,
    preflightQueuePath,
  });

  return {
    packet,
    markdown: renderReplyCaptureUnblockPacket(packet, { generatedAt: options.generatedAt }),
  };
}

async function main() {
  const options = parseReplyCaptureUnblockArgs(process.argv.slice(2));
  const { packet, markdown } = await renderReplyCaptureUnblockFromFiles(options);

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");
  console.log(
    [
      `REPLY_CAPTURE_UNBLOCK=${packet.replyCaptureReady ? "pass" : "pending"}`,
      `status=${packet.status}`,
      `ready_routes=${packet.readyRoutes.length}`,
      `eml_exists=${packet.emlExists}`,
      `evidence_exists=${packet.evidenceExists}`,
      `output=${options.outputPath}`,
    ].join(" "),
  );
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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`REPLY_CAPTURE_UNBLOCK=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
