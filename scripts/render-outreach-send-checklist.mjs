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
  const queue = buildOutreachActionQueue(resultRows, {
    today,
    sendLimit,
    sendTier,
  });
  const batchByRoute = new Map(batchRows.map((row) => [row.route_id, row]));

  return [
    "# TraceReady send execution checklist",
    "",
    `Batch: \`${batchPath}\``,
    `Results: \`${resultsPath}\``,
    `Today: ${today}`,
    ...(sendTier ? [`Send tier filter: ${sendTier}`] : []),
    "",
    "Use this as the send console. Work top to bottom. Only mark a route sent after a real company-level public form or company-level public route has been used.",
    "",
    ...renderSendTasks(queue.sendRows, batchByRoute, resultsPath, today),
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
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function renderSendTasks(sendRows, batchByRoute, resultsPath, today) {
  if (sendRows.length === 0) {
    return ["No unsent routes are queued for this checklist."];
  }

  return sendRows.flatMap((resultRow, index) => {
    const batchRow = batchByRoute.get(resultRow.route_id);

    return [
      `## ${index + 1}. ${resultRow.route_id} - ${resultRow.company_or_channel}`,
      "",
      `- [ ] Open company-level route: ${batchRow.source_url}`,
      `- [ ] Confirm this is still company-level, not a personal profile or direct personal email.`,
      "- [ ] Paste the subject and body exactly as shown below.",
      "- [ ] Submit once. Do not send duplicates from multiple channels on the same day.",
      `- [ ] Mark sent: \`${updateCommand(resultsPath, resultRow.route_id, {
        date_sent: today,
        status: "sent",
        response_type: "none",
        reply_notes: "sent via public route",
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
  const [batchCsv, resultsCsv] = await Promise.all([
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
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

  const markdown = `${renderOutreachSendChecklist(batchRows, resultRows, options)}\n`;
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
