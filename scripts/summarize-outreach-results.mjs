import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import { trackedFieldNoteUrl, trackedFileCheckUrl, trackedPilotProofUrl, trackedProofUrl } from "./outreach-tracking.mjs";

export const RESULT_COLUMNS = [
  "route_id",
  "date_sent",
  "company_or_channel",
  "tier",
  "proof_url",
  "field_note_url",
  "file_check_url",
  "pilot_proof_url",
  "status",
  "response_type",
  "field_note_click_count",
  "file_check_count",
  "paid_order_count",
  "pilot_requested",
  "reply_notes",
  "next_action",
];

const ALLOWED_STATUSES = new Set([
  "not_sent",
  "sent",
  "no_reply",
  "replied",
  "file_checked",
  "paid_order",
  "pilot_requested",
  "disqualified",
]);

const ALLOWED_RESPONSE_TYPES = new Set([
  "none",
  "referral",
  "question",
  "file_check",
  "paid_order",
  "pilot_request",
  "negative",
  "disqualified",
]);

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PERSONAL_PROFILE_PATTERN =
  /(?:linkedin\.com\/in\/|facebook\.com\/people\/|instagram\.com\/p\/|x\.com\/[^/\s]+\/status\/)/i;
const ROUTE_ID_PATTERN = /^b01-r\d{2}$/;

export function parseOutreachResults(csv) {
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }

  return parsed.data.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "").trim()])),
  );
}

export function validateOutreachResults(rows) {
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowText = Object.values(row).join(" ");

    for (const column of RESULT_COLUMNS) {
      if (!(column in row)) {
        errors.push(`missing required column: ${column}`);
      }
    }

    if (!row.company_or_channel) {
      errors.push(`row ${rowNumber} company_or_channel is required`);
    }

    if (!ROUTE_ID_PATTERN.test(row.route_id)) {
      errors.push(`row ${rowNumber} route_id must look like b01-r01`);
    }

    if (row.proof_url !== trackedProofUrl(row.route_id)) {
      errors.push(`row ${rowNumber} proof_url must be a tracked TraceReady proof URL`);
    }

    if (row.field_note_url !== trackedFieldNoteUrl(row.route_id)) {
      errors.push(`row ${rowNumber} field_note_url must be a tracked TraceReady field-note URL`);
    }

    if (row.file_check_url !== trackedFileCheckUrl(row.route_id)) {
      errors.push(`row ${rowNumber} file_check_url must be a tracked TraceReady file-check URL`);
    }

    if (row.pilot_proof_url !== trackedPilotProofUrl(row.route_id)) {
      errors.push(`row ${rowNumber} pilot_proof_url must be a tracked TraceReady documented-pilot URL`);
    }

    if (!ALLOWED_STATUSES.has(row.status)) {
      errors.push(
        `row ${rowNumber} status must be one of ${Array.from(ALLOWED_STATUSES).join(", ")}`,
      );
    }

    if (row.response_type && !ALLOWED_RESPONSE_TYPES.has(row.response_type)) {
      errors.push(
        `row ${rowNumber} response_type must be one of ${Array.from(ALLOWED_RESPONSE_TYPES).join(", ")}`,
      );
    }

    for (const column of ["field_note_click_count", "file_check_count", "paid_order_count"]) {
      if (!isNonNegativeInteger(row[column])) {
        errors.push(`row ${rowNumber} ${column} must be a non-negative integer`);
      }
    }

    if (!["yes", "no"].includes(row.pilot_requested)) {
      errors.push(`row ${rowNumber} pilot_requested must be yes or no`);
    }

    if (EMAIL_PATTERN.test(rowText)) {
      errors.push(`row ${rowNumber} contains an email address; keep committed results templates private-safe`);
    }

    if (PERSONAL_PROFILE_PATTERN.test(rowText)) {
      errors.push(`row ${rowNumber} contains a personal-profile URL`);
    }
  });

  return [...new Set(errors)];
}

export function summarizeOutreachResults(rows) {
  const sentOrBeyondRows = rows.filter((row) => row.status !== "not_sent");
  const repliedRows = rows.filter((row) =>
    ["replied", "file_checked", "paid_order", "pilot_requested"].includes(row.status),
  );
  const fieldNoteClicks = rows.reduce((sum, row) => sum + Number(row.field_note_click_count || 0), 0);
  const fieldNoteClickedRows = rows.filter((row) => Number(row.field_note_click_count || 0) > 0);
  const fileChecks = rows.reduce((sum, row) => sum + Number(row.file_check_count || 0), 0);
  const paidOrders = rows.reduce((sum, row) => sum + Number(row.paid_order_count || 0), 0);
  const pilotRequests = rows.filter(
    (row) => row.pilot_requested === "yes" || row.status === "pilot_requested",
  ).length;
  const disqualified = rows.filter((row) => row.status === "disqualified").length;

  return {
    totalRows: rows.length,
    sentOrBeyond: sentOrBeyondRows.length,
    replies: repliedRows.length,
    fieldNoteClicks,
    fileChecks,
    paidOrders,
    pilotRequests,
    disqualified,
    replyRate: rate(repliedRows.length, sentOrBeyondRows.length),
    fieldNoteClickRate: rate(fieldNoteClickedRows.length, sentOrBeyondRows.length),
    fileCheckRate: rate(fileChecks, sentOrBeyondRows.length),
    paidOrderRate: rate(paidOrders, sentOrBeyondRows.length),
  };
}

export function renderOutreachResultsSummary(summary, options = {}) {
  const sourcePath = options.sourcePath ?? "private/outreach-results.csv";

  return `# TraceReady outreach results summary

Source: \`${sourcePath}\`

| Metric | Value |
| --- | ---: |
| Rows tracked | ${summary.totalRows} |
| Sent or beyond | ${summary.sentOrBeyond} |
| Replies | ${summary.replies} |
| Field-note clicks | ${summary.fieldNoteClicks} |
| Browser/file checks | ${summary.fileChecks} |
| Paid cleanup orders | ${summary.paidOrders} |
| Pilot requests | ${summary.pilotRequests} |
| Disqualified | ${summary.disqualified} |
| Reply rate | ${summary.replyRate} |
| Field-note click rate | ${summary.fieldNoteClickRate} |
| File-check rate | ${summary.fileCheckRate} |
| Paid-order rate | ${summary.paidOrderRate} |

## Next decision

Keep sending if replies, file checks, or paid orders are appearing. If the batch produces no replies or file checks after a full send/follow-up cycle, change the segment, offer, or channel before polishing the product again.
`;
}

function rate(numerator, denominator) {
  if (denominator === 0) {
    return "0.0%";
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function isNonNegativeInteger(value) {
  return /^\d+$/.test(String(value ?? ""));
}

async function main() {
  const sourcePath = process.argv[2] ?? "docs/proof-led-outreach-results-batch-01.csv";
  const csv = await fs.readFile(sourcePath, "utf8");
  const rows = parseOutreachResults(csv);
  const errors = validateOutreachResults(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_RESULTS=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(renderOutreachResultsSummary(summarizeOutreachResults(rows), { sourcePath }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
