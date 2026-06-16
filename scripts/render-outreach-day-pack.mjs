import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildOutreachActionQueue,
} from "./next-outreach-actions.mjs";
import {
  bodyFor,
  followUpFor,
  subjectFor,
} from "./render-outreach-pack.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_RESULTS_PATH = "docs/proof-led-outreach-results-batch-01.csv";
const PRIVATE_RESULTS_PLACEHOLDER = "path/to/private-results.csv";
const DEFAULT_SEND_LIMIT = 8;
const DEFAULT_FOLLOW_UP_AFTER_DAYS = 4;

export function renderOutreachDayPack(batchRows, resultRows, options = {}) {
  const batchPath = options.batchPath ?? DEFAULT_BATCH_PATH;
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const today = options.today ?? todayIsoDate();
  const sendLimit = options.sendLimit ?? DEFAULT_SEND_LIMIT;
  const followUpAfterDays = options.followUpAfterDays ?? DEFAULT_FOLLOW_UP_AFTER_DAYS;
  const sendTier = options.sendTier;
  const queue = buildOutreachActionQueue(resultRows, {
    today,
    sendLimit,
    followUpAfterDays,
    sendTier,
  });
  const batchByRoute = new Map(batchRows.map((row) => [row.route_id, row]));
  const isPublicPreview = normalizePath(resultsPath) === DEFAULT_RESULTS_PATH;
  const commandResultsPath = isPublicPreview ? PRIVATE_RESULTS_PLACEHOLDER : resultsPath;

  return [
    "# TraceReady outreach day pack",
    "",
    `Batch: \`${batchPath}\``,
    `Results: \`${resultsPath}\``,
    `Today: ${today}`,
    ...(sendTier ? [`Send tier filter: ${sendTier}`] : []),
    ...(isPublicPreview
      ? [
          "",
          "Public initialized ledger preview: Copy `docs/proof-led-outreach-results-batch-01.csv` to a private results file before updating rows.",
        ]
      : []),
    "",
    "Use company-level public routes only. Do not add employee names, personal emails, personal-profile URLs, or private reply notes to committed files.",
    "",
    "Proof to lead with: 57,658 public cocoa rows checked; 46,134 point-only plots over 4 hectares; 57,658 rows missing plot IDs; 57,658 rows missing supplier identity.",
    "",
    "## Send Today",
    "",
    ...renderSendToday(queue.sendRows, batchByRoute, commandResultsPath, today),
    "",
    "## Follow Up Today",
    "",
    ...renderFollowUpToday(queue.followUpRows, batchByRoute, commandResultsPath, today),
    "",
    "## Active Opportunities",
    "",
    ...renderActiveOpportunities(queue.opportunityRows),
    "",
  ].join("\n");
}

export function validateOutreachDayPackInputs(batchRows, resultRows) {
  const batchByRoute = new Map(batchRows.map((row) => [row.route_id, row]));
  const errors = [];

  for (const resultRow of resultRows) {
    const batchRow = batchByRoute.get(resultRow.route_id);

    if (!batchRow) {
      errors.push(`result route ${resultRow.route_id} is missing from the outreach batch ledger`);
      continue;
    }

    if (batchRow.company_or_channel !== resultRow.company_or_channel) {
      errors.push(`result route ${resultRow.route_id} company_or_channel does not match the outreach batch ledger`);
    }
  }

  return [...new Set(errors)];
}

export function parseOutreachDayPackArgs(argv) {
  const args = [...argv];
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    outputPath: undefined,
    today: todayIsoDate(),
    sendLimit: DEFAULT_SEND_LIMIT,
    followUpAfterDays: DEFAULT_FOLLOW_UP_AFTER_DAYS,
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
    } else if (flag === "--follow-up-after-days") {
      parsed.followUpAfterDays = parsePositiveInteger(value, flag);
    } else if (flag === "--send-tier") {
      parsed.sendTier = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function renderSendToday(rows, batchByRoute, resultsPath, today) {
  if (rows.length === 0) {
    return ["No unsent routes are queued for this block."];
  }

  return rows.flatMap((resultRow) => {
    const batchRow = batchByRoute.get(resultRow.route_id);

    return [
      `### ${resultRow.route_id} - ${resultRow.company_or_channel}`,
      "",
      `- Public route: ${batchRow.public_route}`,
      `- Source: ${batchRow.source_url}`,
      `- Proof URL: ${resultRow.proof_url}`,
      `- Field note URL: ${batchRow.field_note_url}`,
      `- File check URL: ${resultRow.file_check_url}`,
      "",
      "```text",
      `Subject: ${subjectFor(batchRow)}`,
      "",
      bodyFor(batchRow),
      "```",
      "",
      `Mark sent: \`${updateCommand(resultsPath, resultRow.route_id, {
        date_sent: today,
        status: "sent",
        response_type: "none",
        reply_notes: "sent via public route",
        next_action: "follow up in 4 business days",
      })}\``,
      "",
    ];
  });
}

function renderFollowUpToday(rows, batchByRoute, resultsPath, today) {
  if (rows.length === 0) {
    return ["No follow-ups are due by the configured threshold."];
  }

  return rows.flatMap((resultRow) => {
    const batchRow = batchByRoute.get(resultRow.route_id);

    return [
      `### ${resultRow.route_id} - ${resultRow.company_or_channel}`,
      "",
      `- Follow-up timing: sent ${daysBetween(resultRow.date_sent, today)} days ago on ${resultRow.date_sent}`,
      `- Proof URL: ${resultRow.proof_url}`,
      `- Field note URL: ${batchRow.field_note_url}`,
      "",
      "```text",
      "Subject: Re: EUDR file-readiness check",
      "",
      followUpFor(batchRow),
      "```",
      "",
      `Mark followed up: \`${updateCommand(resultsPath, resultRow.route_id, {
        status: "no_reply",
        response_type: "none",
        reply_notes: "followed up via public route",
        next_action: "wait for reply or change channel",
      })}\``,
      "",
    ];
  });
}

function renderActiveOpportunities(rows) {
  if (rows.length === 0) {
    return ["No replies, file checks, or pilot requests are waiting for conversion action."];
  }

  return rows.flatMap((row) => [
    `### ${row.route_id} - ${row.company_or_channel}`,
    "",
    `- Status: ${row.status}`,
    `- Field-note clicks: ${row.field_note_click_count}`,
    `- File checks: ${row.file_check_count}`,
    `- Pilot requested: ${row.pilot_requested}`,
    `- Next action: ${row.next_action || "ask for the next concrete file or paid cleanup step"}`,
    `- File check URL: ${row.file_check_url}`,
    "",
  ]);
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

function daysBetween(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.floor((end - start) / 86_400_000);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

async function main() {
  const options = parseOutreachDayPackArgs(process.argv.slice(2));
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
      console.error(`OUTREACH_DAY_PACK=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = `${renderOutreachDayPack(batchRows, resultRows, options)}\n`;

  if (options.outputPath) {
    await fs.writeFile(options.outputPath, markdown, "utf8");
    console.log(`OUTREACH_DAY_PACK=pass path=${options.outputPath}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_DAY_PACK=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
