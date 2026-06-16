import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutreachActionQueue } from "./next-outreach-actions.mjs";
import { bodyFor, subjectFor } from "./render-outreach-pack.mjs";
import { validateOutreachDayPackInputs } from "./render-outreach-day-pack.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-01.csv";
const DEFAULT_OUTPUT_PATH = "private/send-execution-checklist.md";
const DEFAULT_SEND_LIMIT = 3;

export function renderOutreachSendChecklist(batchRows, resultRows, options = {}) {
  const batchPath = options.batchPath ?? DEFAULT_BATCH_PATH;
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const today = options.today ?? todayIsoDate();
  const sendLimit = options.sendLimit ?? DEFAULT_SEND_LIMIT;
  const sendTier = options.sendTier;
  const routeAudit = options.routeAudit;
  const sendabilityAudit = options.sendabilityAudit;
  const queue = buildOutreachActionQueue(resultRows, {
    today,
    sendLimit: routeAudit || sendabilityAudit ? resultRows.length : sendLimit,
    sendTier,
  });
  const routeGate = routeAudit
    ? applyRouteAuditGate(queue.sendRows, routeAudit, sendabilityAudit ? resultRows.length : sendLimit)
    : undefined;
  const routeGatedRows = routeGate?.sendRows ?? queue.sendRows;
  const sendabilityGate = sendabilityAudit ? applySendabilityAuditGate(routeGatedRows, sendabilityAudit, sendLimit) : undefined;
  const sendRows = sendabilityGate?.sendRows ?? routeGatedRows;
  const batchByRoute = new Map(batchRows.map((row) => [row.route_id, row]));

  return [
    "# TraceReady send execution checklist",
    "",
    `Batch: \`${batchPath}\``,
    `Results: \`${resultsPath}\``,
    `Today: ${today}`,
    ...(sendTier ? [`Send tier filter: ${sendTier}`] : []),
    ...(options.routeAuditPath ? [`Route audit: \`${options.routeAuditPath}\``] : []),
    ...(options.sendabilityAuditPath ? [`Sendability audit: \`${options.sendabilityAuditPath}\``] : []),
    "",
    "Use this as the send console. Work top to bottom. Only mark a route sent after a real company-level public form or company-level public route has been used.",
    ...(routeAudit
      ? [
          "Route health gate is active: only audited routes marked reachable are queued for sending.",
        ]
      : []),
    ...(sendabilityAudit
      ? [
          "Sendability gate is active: only audited routes marked browser_form_ready are queued for browser-form sending.",
        ]
      : []),
    "",
    ...renderSendTasks(sendRows, batchByRoute, resultsPath, today, routeAudit, sendabilityAudit),
    "",
    ...renderSkippedByRouteHealth(routeGate?.skippedRows ?? [], batchByRoute),
    "",
    ...renderSkippedBySendability(sendabilityGate?.skippedRows ?? [], batchByRoute),
    "",
    "## End-of-block checks",
    "",
    `- [ ] Re-run: \`npm run summarize:outreach -- ${resultsPath}\``,
    `- [ ] Re-render next block: \`npm run prepare:outreach -- --today ${today} --send-limit ${sendLimit}${sendTier ? ` --send-tier ${sendTier}` : ""}\``,
    "- [ ] Do not commit private replies, customer files, raw coordinates, screenshots, or order evidence.",
    "",
  ].join("\n");
}

export function parseOutreachSendChecklistArgs(argv) {
  const args = [...argv];
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    today: todayIsoDate(),
    sendLimit: DEFAULT_SEND_LIMIT,
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
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else if (flag === "--today") {
      parsed.today = value;
    } else if (flag === "--send-limit") {
      parsed.sendLimit = parsePositiveInteger(value, flag);
    } else if (flag === "--send-tier") {
      parsed.sendTier = value;
    } else if (flag === "--route-audit") {
      parsed.routeAuditPath = value;
    } else if (flag === "--sendability-audit") {
      parsed.sendabilityAuditPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function renderSendTasks(sendRows, batchByRoute, resultsPath, today, routeAudit, sendabilityAudit) {
  if (sendRows.length === 0) {
    return ["No unsent routes are queued for this checklist."];
  }

  const routeHealthById = routeAudit ? routeAuditMap(routeAudit) : new Map();
  const sendabilityById = sendabilityAudit ? sendabilityAuditMap(sendabilityAudit) : new Map();

  return sendRows.flatMap((resultRow, index) => {
    const batchRow = batchByRoute.get(resultRow.route_id);
    const routeHealth = routeHealthById.get(resultRow.route_id);
    const sendability = sendabilityById.get(resultRow.route_id);
    const sourceUrl = sendability?.route_url ?? batchRow.source_url;

    return [
      `## ${index + 1}. ${resultRow.route_id} - ${resultRow.company_or_channel}`,
      "",
      ...(routeHealth ? [`- Route audit health: ${routeHealth.health}${routeHealth.status ? ` (${routeHealth.status})` : ""}`] : []),
      ...(sendability
        ? [
            `- Sendability: ${sendability.sendability}${sendability.contact_method ? ` via ${sendability.contact_method}` : ""}`,
          ]
        : []),
      `- [ ] Open company-level route: ${sourceUrl}`,
      `- [ ] Confirm this is still company-level, not a personal profile or direct personal email.`,
      "- [ ] Paste the subject and body exactly as shown below.",
      "- [ ] Submit once. Do not send duplicates from multiple channels on the same day.",
      `- [ ] Mark sent: \`${updateCommand(resultsPath, resultRow.route_id, {
        date_sent: today,
        status: "sent",
        response_type: "none",
        reply_notes: sendability?.contact_method === "public_browser_form" ? "sent via public browser form" : "sent via public route",
        next_action: "follow up in 4 business days",
      })}\``,
      `- [ ] Prepare reply handling: \`npm run render:outreach-replies -- --results ${resultsPath} --route ${resultRow.route_id} --output private/replies-${resultRow.route_id}.md\``,
      "",
      "```text",
      `Subject: ${subjectFor(batchRow)}`,
      "",
      bodyFor(batchRow),
      "```",
      "",
    ];
  });
}

function applySendabilityAuditGate(sendRows, sendabilityAudit, sendLimit) {
  const sendabilityById = sendabilityAuditMap(sendabilityAudit);
  const auditedRows = sendRows.filter((row) => sendabilityById.has(row.route_id));
  const sendableRows = auditedRows.filter((row) => sendabilityById.get(row.route_id)?.sendability === "browser_form_ready");
  const skippedRows = auditedRows
    .filter((row) => sendabilityById.get(row.route_id)?.sendability !== "browser_form_ready")
    .map((row) => ({
      ...row,
      sendability: sendabilityById.get(row.route_id),
    }));

  return {
    sendRows: sendableRows.slice(0, sendLimit),
    skippedRows,
  };
}

function applyRouteAuditGate(sendRows, routeAudit, sendLimit) {
  const routeHealthById = routeAuditMap(routeAudit);
  const auditedRows = sendRows.filter((row) => routeHealthById.has(row.route_id));
  const sendableRows = auditedRows.filter((row) => routeHealthById.get(row.route_id)?.health === "reachable");
  const skippedRows = auditedRows
    .filter((row) => routeHealthById.get(row.route_id)?.health !== "reachable")
    .map((row) => ({
      ...row,
      routeHealth: routeHealthById.get(row.route_id),
    }));

  return {
    sendRows: sendableRows.slice(0, sendLimit),
    skippedRows,
  };
}

function renderSkippedByRouteHealth(skippedRows, batchByRoute) {
  if (skippedRows.length === 0) {
    return [];
  }

  return [
    "## Skipped By Route Health",
    "",
    ...skippedRows.map((row) => {
      const batchRow = batchByRoute.get(row.route_id);
      const note = row.routeHealth?.note ? `, ${row.routeHealth.note}` : "";

      return `- ${row.route_id} - ${row.company_or_channel}: ${row.routeHealth?.health ?? "unknown"}${note}. Manual check before sending: ${batchRow?.source_url ?? row.source_url}`;
    }),
  ];
}

function renderSkippedBySendability(skippedRows, batchByRoute) {
  if (skippedRows.length === 0) {
    return [];
  }

  return [
    "## Skipped By Sendability",
    "",
    ...skippedRows.map((row) => {
      const batchRow = batchByRoute.get(row.route_id);
      const blocker = row.sendability?.blocker ? `, ${row.sendability.blocker}` : "";
      const sourceUrl = row.sendability?.route_url ?? batchRow?.source_url ?? row.source_url;

      return `- ${row.route_id} - ${row.company_or_channel}: ${row.sendability?.sendability ?? "unknown"}${blocker}. Manual check before sending: ${sourceUrl}`;
    }),
  ];
}

function routeAuditMap(routeAudit) {
  return new Map((routeAudit.routes ?? []).map((route) => [route.route_id, route]));
}

function sendabilityAuditMap(sendabilityAudit) {
  return new Map((sendabilityAudit.routes ?? []).map((route) => [route.route_id, route]));
}

function updateCommand(resultsPath, routeId, patch) {
  return [
    "npm run update:outreach-result --",
    `--results ${resultsPath}`,
    `--route ${routeId}`,
    ...Object.entries(patch).map(([key, value]) => `${flagForPatchKey(key)} ${quoteIfNeeded(value)}`),
  ].join(" ");
}

function flagForPatchKey(key) {
  if (key === "reply_notes") {
    return "--notes";
  }

  return `--${key.replace(/_/g, "-")}`;
}

function quoteIfNeeded(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function parsePositiveInteger(value, flag) {
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return Number(value);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const options = parseOutreachSendChecklistArgs(process.argv.slice(2));
  const [batchCsv, resultsCsv, routeAuditJson, sendabilityAuditJson] = await Promise.all([
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
    options.routeAuditPath ? fs.readFile(options.routeAuditPath, "utf8") : Promise.resolve(""),
    options.sendabilityAuditPath ? fs.readFile(options.sendabilityAuditPath, "utf8") : Promise.resolve(""),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const routeAudit = routeAuditJson ? JSON.parse(routeAuditJson) : undefined;
  const sendabilityAudit = sendabilityAuditJson ? JSON.parse(sendabilityAuditJson) : undefined;
  const errors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachDayPackInputs(batchRows, resultRows),
  ];

  if (errors.length > 0) {
    for (const error of [...new Set(errors)]) {
      console.error(`OUTREACH_SEND_CHECKLIST=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = `${renderOutreachSendChecklist(batchRows, resultRows, { ...options, routeAudit, sendabilityAudit })}\n`;
  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");
  console.log(`OUTREACH_SEND_CHECKLIST=pass path=${options.outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_SEND_CHECKLIST=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
