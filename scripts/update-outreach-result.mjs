import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import {
  parseOutreachResults,
  RESULT_COLUMNS,
  validateOutreachResults,
} from "./summarize-outreach-results.mjs";

const PUBLIC_RESULTS_PATH = "docs/proof-led-outreach-results-batch-01.csv";
const ALLOWED_PATCH_COLUMNS = new Set([
  "date_sent",
  "status",
  "response_type",
  "field_note_click_count",
  "file_check_count",
  "paid_order_count",
  "pilot_requested",
  "reply_notes",
  "next_action",
]);

const FLAG_TO_PATCH_COLUMN = new Map([
  ["--date-sent", "date_sent"],
  ["--status", "status"],
  ["--response-type", "response_type"],
  ["--field-note-click-count", "field_note_click_count"],
  ["--field-note-clicks", "field_note_click_count"],
  ["--file-check-count", "file_check_count"],
  ["--file-checks", "file_check_count"],
  ["--paid-order-count", "paid_order_count"],
  ["--paid-orders", "paid_order_count"],
  ["--pilot-requested", "pilot_requested"],
  ["--notes", "reply_notes"],
  ["--next-action", "next_action"],
]);

export function updateOutreachResult(rows, routeId, patch) {
  const rowIndex = rows.findIndex((row) => row.route_id === routeId);

  if (rowIndex === -1) {
    throw new Error(`route ${routeId} was not found in results ledger`);
  }

  const nextRows = rows.map((row, index) =>
    index === rowIndex
      ? {
          ...row,
          ...cleanPatch(patch),
        }
      : { ...row },
  );
  const errors = validateOutreachResults(nextRows);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return nextRows;
}

export function renderUpdatedOutreachResultsCsv(rows) {
  return Papa.unparse(rows, {
    columns: RESULT_COLUMNS,
    newline: "\n",
  });
}

export function parseUpdateArgs(argv) {
  const args = [...argv];
  const patch = {};
  let resultsPath = "";
  let routeId = "";

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
      resultsPath = value;
    } else if (flag === "--route") {
      routeId = value;
    } else if (FLAG_TO_PATCH_COLUMN.has(flag)) {
      patch[FLAG_TO_PATCH_COLUMN.get(flag)] = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!resultsPath) {
    throw new Error("missing --results path/to/private-results.csv");
  }

  if (!routeId) {
    throw new Error("missing --route b01-rNN");
  }

  return { resultsPath, routeId, patch };
}

export function assertSafeResultsPath(resultsPath) {
  const normalized = resultsPath.replace(/\\/g, "/");

  if (normalized === PUBLIC_RESULTS_PATH) {
    throw new Error(
      "refusing to update committed public results ledger; copy it to a private working file first",
    );
  }
}

function cleanPatch(patch) {
  const entries = Object.entries(patch).map(([key, value]) => [key, String(value ?? "").trim()]);
  const unknownColumns = entries.filter(([key]) => !ALLOWED_PATCH_COLUMNS.has(key));

  if (unknownColumns.length > 0) {
    throw new Error(`unknown update columns: ${unknownColumns.map(([key]) => key).join(", ")}`);
  }

  return Object.fromEntries(entries);
}

async function main() {
  const { resultsPath, routeId, patch } = parseUpdateArgs(process.argv.slice(2));
  assertSafeResultsPath(resultsPath);

  const csv = await fs.readFile(resultsPath, "utf8");
  const rows = parseOutreachResults(csv);
  const updatedRows = updateOutreachResult(rows, routeId, patch);

  await fs.writeFile(resultsPath, `${renderUpdatedOutreachResultsCsv(updatedRows)}\n`, "utf8");
  console.log(`OUTREACH_RESULT_UPDATE=pass route=${routeId} path=${resultsPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_RESULT_UPDATE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
