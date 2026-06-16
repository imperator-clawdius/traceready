import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";

const DEFAULT_RESULTS_PATH = "docs/proof-led-outreach-results-batch-01.csv";
const PRIVATE_RESULTS_PLACEHOLDER = "path/to/private-results.csv";
const DEFAULT_SEND_LIMIT = 8;
const DEFAULT_FOLLOW_UP_AFTER_DAYS = 4;
const FOLLOW_UP_STATUSES = new Set(["sent", "no_reply"]);
const OPPORTUNITY_STATUSES = new Set(["replied", "file_checked", "pilot_requested"]);

export function buildOutreachActionQueue(rows, options = {}) {
  const today = options.today ?? todayIsoDate();
  const sendLimit = options.sendLimit ?? DEFAULT_SEND_LIMIT;
  const followUpAfterDays = options.followUpAfterDays ?? DEFAULT_FOLLOW_UP_AFTER_DAYS;
  const unsentRows = rows.filter((row) => row.status === "not_sent");
  const followUpRows = rows.filter((row) => {
    if (!FOLLOW_UP_STATUSES.has(row.status) || !row.date_sent) {
      return false;
    }

    return daysBetween(row.date_sent, today) >= followUpAfterDays;
  });
  const opportunityRows = rows.filter(
    (row) => OPPORTUNITY_STATUSES.has(row.status) && Number(row.paid_order_count || 0) === 0,
  );

  return {
    today,
    sendLimit,
    followUpAfterDays,
    sendRows: unsentRows.slice(0, sendLimit),
    followUpRows,
    opportunityRows,
    summary: {
      totalRows: rows.length,
      sendRemaining: unsentRows.length,
      sendShown: Math.min(unsentRows.length, sendLimit),
      followUpsDue: followUpRows.length,
      activeOpportunities: opportunityRows.length,
    },
  };
}

export function renderOutreachActionQueue(queue, options = {}) {
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const isPublicPreview = normalizePath(resultsPath) === DEFAULT_RESULTS_PATH;
  const commandResultsPath = isPublicPreview ? PRIVATE_RESULTS_PLACEHOLDER : resultsPath;
  const today = options.today ?? queue.today;

  return [
    "# TraceReady next outreach actions",
    "",
    `Source: \`${resultsPath}\``,
    `Today: ${today}`,
    ...(isPublicPreview
      ? [
          "",
          "Public initialized ledger preview: Copy `docs/proof-led-outreach-results-batch-01.csv` to a private results file before updating rows.",
        ]
      : []),
    "",
    "| Queue | Count |",
    "| --- | ---: |",
    `| Rows tracked | ${queue.summary.totalRows} |`,
    `| Unsent routes remaining | ${queue.summary.sendRemaining} |`,
    `| Send routes shown | ${queue.summary.sendShown} |`,
    `| Follow-ups due | ${queue.summary.followUpsDue} |`,
    `| Active opportunities | ${queue.summary.activeOpportunities} |`,
    "",
    "## Send Next",
    "",
    ...renderSendRows(queue.sendRows, commandResultsPath, today),
    "",
    "## Follow Up Due",
    "",
    ...renderFollowUpRows(queue.followUpRows, commandResultsPath, today),
    "",
    "## Active Opportunities",
    "",
    ...renderOpportunityRows(queue.opportunityRows),
    "",
  ].join("\n");
}

export function parseNextActionArgs(argv) {
  const args = [...argv];
  const parsed = {
    resultsPath: DEFAULT_RESULTS_PATH,
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

    if (flag === "--results") {
      parsed.resultsPath = value;
    } else if (flag === "--today") {
      parsed.today = value;
    } else if (flag === "--send-limit") {
      parsed.sendLimit = parsePositiveInteger(value, flag);
    } else if (flag === "--follow-up-after-days") {
      parsed.followUpAfterDays = parsePositiveInteger(value, flag);
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function renderSendRows(rows, resultsPath, today) {
  if (rows.length === 0) {
    return ["No unsent routes remain in this ledger."];
  }

  return rows.flatMap((row, index) => [
    `${index + 1}. ${row.route_id} - ${row.company_or_channel}`,
    `   - Tier: ${row.tier}`,
    `   - Proof URL: ${row.proof_url}`,
    `   - Field note URL: ${row.field_note_url}`,
    `   - File check URL: ${row.file_check_url}`,
    `   - Mark sent: \`${updateCommand(resultsPath, row.route_id, {
      date_sent: today,
      status: "sent",
      response_type: "none",
      reply_notes: "sent via public route",
      next_action: "follow up in 4 business days",
    })}\``,
  ]);
}

function renderFollowUpRows(rows, resultsPath, today) {
  if (rows.length === 0) {
    return ["No follow-ups are due by the configured threshold."];
  }

  return rows.flatMap((row, index) => [
    `${index + 1}. ${row.route_id} - ${row.company_or_channel} (sent ${daysBetween(row.date_sent, today)} days ago)`,
    `   - Current next action: ${row.next_action || "follow up"}`,
    `   - Follow-up URL: ${row.proof_url}`,
    `   - Field note URL: ${row.field_note_url}`,
    `   - Mark followed up: \`${updateCommand(resultsPath, row.route_id, {
      status: "no_reply",
      response_type: "none",
      reply_notes: "followed up via public route",
      next_action: "wait for reply or change channel",
    })}\``,
  ]);
}

function renderOpportunityRows(rows) {
  if (rows.length === 0) {
    return ["No replies, file checks, or pilot requests are waiting for conversion action."];
  }

  return rows.flatMap((row, index) => [
    `${index + 1}. ${row.route_id} - ${row.company_or_channel}`,
    `   - Status: ${row.status}`,
    `   - Field-note clicks: ${row.field_note_click_count}`,
    `   - File checks: ${row.file_check_count}`,
    `   - Pilot requested: ${row.pilot_requested}`,
    `   - Next action: ${row.next_action || "ask for the next concrete file or paid cleanup step"}`,
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
  const options = parseNextActionArgs(process.argv.slice(2));
  const csv = await fs.readFile(options.resultsPath, "utf8");
  const rows = parseOutreachResults(csv);
  const errors = validateOutreachResults(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_NEXT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const queue = buildOutreachActionQueue(rows, options);
  console.log(renderOutreachActionQueue(queue, options));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_NEXT=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
