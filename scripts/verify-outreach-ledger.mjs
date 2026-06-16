import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import {
  routeIdForRowNumber,
  trackedFieldNoteUrl,
  trackedFileCheckUrl,
  trackedProofUrl,
} from "./outreach-tracking.mjs";

export const REQUIRED_COLUMNS = [
  "priority",
  "route_id",
  "tier",
  "company_or_channel",
  "segment",
  "why_it_fits",
  "public_route",
  "source_url",
  "proof_url",
  "field_note_url",
  "file_check_url",
  "message_variant",
  "proof_hook",
  "ask",
  "status",
  "next_step",
];

const ALLOWED_MESSAGE_VARIANTS = new Set(["association", "importer", "overflow"]);
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PERSONAL_PROFILE_PATTERN =
  /(?:linkedin\.com\/in\/|facebook\.com\/people\/|instagram\.com\/p\/|x\.com\/[^/\s]+\/status\/)/i;

export function parseOutreachLedger(csv) {
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

export function validateOutreachLedger(rows, options = {}) {
  const errors = [];
  const expectedRows = options.expectedRows ?? 20;

  if (rows.length !== expectedRows) {
    errors.push(`expected ${expectedRows} rows, found ${rows.length}`);
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowText = Object.values(row).join(" ");
    const expectedRouteId = routeIdForRowNumber(rowNumber);

    for (const column of REQUIRED_COLUMNS) {
      if (!(column in row)) {
        errors.push(`missing required column: ${column}`);
      } else if (!row[column]) {
        errors.push(`row ${rowNumber} ${column} is required`);
      }
    }

    if (row.priority && Number(row.priority) !== rowNumber) {
      errors.push(`row ${rowNumber} priority must match row order`);
    }

    if (row.route_id && row.route_id !== expectedRouteId) {
      errors.push(`row ${rowNumber} route_id must be ${expectedRouteId}`);
    }

    if (row.source_url && !row.source_url.startsWith("https://")) {
      errors.push(`row ${rowNumber} source_url must be an https URL`);
    }

    if (row.proof_url && row.proof_url !== trackedProofUrl(expectedRouteId)) {
      errors.push(`row ${rowNumber} proof_url must be tracked TraceReady proof URL for ${expectedRouteId}`);
    }

    if (row.field_note_url && row.field_note_url !== trackedFieldNoteUrl(expectedRouteId)) {
      errors.push(`row ${rowNumber} field_note_url must be tracked TraceReady field-note URL for ${expectedRouteId}`);
    }

    if (row.file_check_url && row.file_check_url !== trackedFileCheckUrl(expectedRouteId)) {
      errors.push(
        `row ${rowNumber} file_check_url must be tracked TraceReady file-check URL for ${expectedRouteId}`,
      );
    }

    if (EMAIL_PATTERN.test(rowText)) {
      errors.push(`row ${rowNumber} contains an email address; use company-level route URLs only`);
    }

    if (PERSONAL_PROFILE_PATTERN.test(rowText)) {
      errors.push(`row ${rowNumber} source_url must not be a personal-profile URL`);
    }

    if (row.message_variant && !ALLOWED_MESSAGE_VARIANTS.has(row.message_variant)) {
      errors.push(`row ${rowNumber} message_variant must be association, importer, or overflow`);
    }

    if (row.proof_hook && !/(57,658|46,134)/.test(row.proof_hook)) {
      errors.push(`row ${rowNumber} proof_hook must include the public audit numbers`);
    }

    if (row.status && row.status !== "not_started") {
      errors.push(`row ${rowNumber} status must be not_started in the committed batch`);
    }
  });

  return [...new Set(errors)];
}

async function main() {
  const ledgerPath = process.argv[2] ?? "docs/proof-led-outreach-batch-01.csv";
  const csv = await fs.readFile(ledgerPath, "utf8");
  const rows = parseOutreachLedger(csv);
  const errors = validateOutreachLedger(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_LEDGER=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`OUTREACH_LEDGER=pass rows=${rows.length} path=${ledgerPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
