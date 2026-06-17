import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";

const DEFAULT_RESULTS_PATH = "docs/proof-led-outreach-results-batch-01.csv";
const PRIVATE_RESULTS_PLACEHOLDER = "path/to/private-results.csv";
const DEFAULT_SEND_LIMIT = 8;
const DEFAULT_FOLLOW_UP_AFTER_DAYS = 4;
const DEFAULT_SCORECARD_GATE = "run_score_traction_before_external_submission";
const REPLY_CAPTURE_GATE = "verify_reply_capture_before_external_submission";
const FOLLOW_UP_STATUSES = new Set(["sent", "no_reply"]);
const OPPORTUNITY_STATUSES = new Set(["replied", "file_checked", "pilot_requested"]);

export function buildOutreachActionQueue(rows, options = {}) {
  const today = options.today ?? todayIsoDate();
  const sendLimit = options.sendLimit ?? DEFAULT_SEND_LIMIT;
  const followUpAfterDays = options.followUpAfterDays ?? DEFAULT_FOLLOW_UP_AFTER_DAYS;
  const sendTier = options.sendTier;
  const unsentRows = rows.filter((row) => row.status === "not_sent" && (!sendTier || row.tier === sendTier));
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
    sendTier,
    sendRows: unsentRows.slice(0, sendLimit),
    followUpRows,
    opportunityRows,
    summary: {
      totalRows: rows.length,
      sendRemaining: unsentRows.length,
      sendShown: Math.min(unsentRows.length, sendLimit),
      followUpsDue: followUpRows.length,
      activeOpportunities: opportunityRows.length,
      ...(sendTier ? { sendTier } : {}),
    },
  };
}

export function renderOutreachActionQueue(queue, options = {}) {
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const isPublicPreview = normalizePath(resultsPath) === DEFAULT_RESULTS_PATH;
  const commandResultsPath = isPublicPreview ? PRIVATE_RESULTS_PLACEHOLDER : resultsPath;
  const today = options.today ?? queue.today;
  const readiness = options.readiness;
  const sendBlocked = isReplyCaptureGatePending(readiness);

  return [
    "# TraceReady next outreach actions",
    "",
    `Source: \`${resultsPath}\``,
    ...(options.scorecardPath ? [`Scorecard: \`${options.scorecardPath}\``] : []),
    `Today: ${today}`,
    ...(queue.sendTier ? [`Send tier filter: ${queue.sendTier}`] : []),
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
    ...renderReadinessGate(readiness, today),
    ...(readiness ? [""] : []),
    sendBlocked ? "## Send Next (blocked)" : "## Send Next",
    "",
    ...(sendBlocked ? ["Reply capture gate is pending; queue shown for planning only.", ""] : []),
    ...renderSendRows(queue.sendRows, commandResultsPath, today, { blocked: sendBlocked }),
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

export function parseTractionReadinessSummary(markdown) {
  const currentState = matchBacktickedValue(markdown, "Current state");
  const nextGate = matchBacktickedValue(markdown, "Next gate");
  const replyCaptureStatus =
    markdown.match(/\|\s*OUTREACH_EMAIL_REPLY_CAPTURE\s*\|\s*([^|\s]+)\s*\|/i)?.[1]?.toLowerCase() ?? "unknown";

  return {
    currentState,
    nextGate,
    replyCaptureStatus,
    replyCaptureReady: replyCaptureStatus === "pass",
  };
}

export function parseNextActionArgs(argv) {
  const args = [...argv];
  const parsed = {
    resultsPath: DEFAULT_RESULTS_PATH,
    today: todayIsoDate(),
    sendLimit: DEFAULT_SEND_LIMIT,
    followUpAfterDays: DEFAULT_FOLLOW_UP_AFTER_DAYS,
    scorecardRequired: false,
  };
  let scorecardExplicit = false;

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
    } else if (flag === "--send-tier") {
      parsed.sendTier = value;
    } else if (flag === "--scorecard") {
      parsed.scorecardPath = value;
      parsed.scorecardRequired = true;
      scorecardExplicit = true;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!scorecardExplicit) {
    parsed.scorecardPath = defaultScorecardPath(parsed.today);
  }

  return parsed;
}

function renderReadinessGate(readiness, today) {
  if (!readiness) {
    return [];
  }

  const state = readiness.currentState ?? "unknown";
  const nextGate = readiness.nextGate ?? "unknown";
  const status = isReplyCaptureGatePending(readiness) ? "pending" : "pass";

  return [
    "## Readiness Gate",
    "",
    `OUTREACH_NEXT_GATE=${status} state=${state} next_gate=${nextGate}`,
    ...(status === "pending"
      ? [
          "",
          "Do not submit public forms or measure non-response until reply capture evidence is recorded.",
          "",
          "Prepare a unique reply-capture challenge, send that subject to the alias from a separate mailbox, and record proof after it arrives:",
          `\`npm run prepare:reply-capture -- --output private/reply-capture-challenge.json --contact founder@traceready.online --handoff-output private/reply-capture-handoff.md --email-draft-output private/reply-capture-email.eml\``,
          `\`npm run verify:reply-capture-challenge -- --challenge private/reply-capture-challenge.json --evidence-output private/reply-capture-evidence.json --contact founder@traceready.online --handoff-output private/reply-capture-handoff.md --email-draft-output private/reply-capture-email.eml\``,
          `\`npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --received-at <received-at-iso> --challenge private/reply-capture-challenge.json --confirm-controlled-inbox\``,
          "",
          "Then refresh the private readiness artifacts:",
          `\`npm run finalize:reply-capture\``,
          `\`npm run score:traction -- --reply-capture-evidence private/reply-capture-evidence.json --reply-capture-challenge private/reply-capture-challenge.json --output private/traction-readiness-scorecard-${today}.md --today ${today}\``,
          `\`npm run preflight:outreach-submit -- --all-ready --reply-capture-evidence private/reply-capture-evidence.json --reply-capture-challenge private/reply-capture-challenge.json --output-dir private --queue-output private/preflight-submit-queue.md --today ${today}\``,
        ]
      : ["", "Reply capture evidence is recorded; use the queue below against the current private ledger."]),
  ];
}

function isReplyCaptureGatePending(readiness) {
  if (!readiness) {
    return false;
  }

  return (
    readiness.replyCaptureReady !== true ||
    readiness.nextGate === REPLY_CAPTURE_GATE ||
    /reply_capture_(at_risk|pending)/.test(readiness.currentState ?? "")
  );
}

function matchBacktickedValue(markdown, label) {
  return markdown.match(new RegExp(`${label}:\\s+\`([^\`]+)\``, "i"))?.[1];
}

function renderSendRows(rows, resultsPath, today, options = {}) {
  if (rows.length === 0) {
    return ["No unsent routes remain in this ledger."];
  }

  return rows.flatMap((row, index) => {
    const lines = [
      `${index + 1}. ${row.route_id} - ${row.company_or_channel}`,
      `   - Tier: ${row.tier}`,
      `   - Proof URL: ${row.proof_url}`,
      `   - Field note URL: ${row.field_note_url}`,
      `   - File check URL: ${row.file_check_url}`,
    ];

    if (options.blocked) {
      return [...lines, "   - Mark sent command withheld until reply capture passes."];
    }

    return [
      ...lines,
      `   - Mark sent: \`${updateCommand(resultsPath, row.route_id, {
        date_sent: today,
        status: "sent",
        response_type: "none",
        reply_notes: "sent via public route",
        next_action: "follow up in 4 business days",
      })}\``,
    ];
  });
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

function defaultScorecardPath(today) {
  return `private/traction-readiness-scorecard-${today}.md`;
}

async function loadTractionReadiness(scorecardPath, { required = false } = {}) {
  if (!scorecardPath) {
    return undefined;
  }

  try {
    return parseTractionReadinessSummary(await fs.readFile(scorecardPath, "utf8"));
  } catch (error) {
    if (required) {
      throw error;
    }

    return {
      currentState: "scorecard_missing",
      nextGate: DEFAULT_SCORECARD_GATE,
      replyCaptureStatus: "unknown",
      replyCaptureReady: false,
    };
  }
}

async function main() {
  const options = parseNextActionArgs(process.argv.slice(2));
  const csv = await fs.readFile(options.resultsPath, "utf8");
  const rows = parseOutreachResults(csv);
  const readiness = await loadTractionReadiness(options.scorecardPath, { required: options.scorecardRequired });
  const errors = validateOutreachResults(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_NEXT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const queue = buildOutreachActionQueue(rows, options);
  console.log(renderOutreachActionQueue(queue, { ...options, readiness }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_NEXT=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
