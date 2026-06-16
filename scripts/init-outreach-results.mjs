import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { RESULT_COLUMNS, validateOutreachResults } from "./summarize-outreach-results.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_OUTPUT_PATH = "docs/proof-led-outreach-results-batch-01.csv";

export function buildInitialOutreachResults(batchRows) {
  return batchRows.map((row) => ({
    route_id: row.route_id,
    date_sent: "",
    company_or_channel: row.company_or_channel,
    tier: row.tier,
    proof_url: row.proof_url,
    file_check_url: row.file_check_url,
    status: "not_sent",
    response_type: "none",
    file_check_count: "0",
    paid_order_count: "0",
    pilot_requested: "no",
    reply_notes: "",
    next_action: "send first message from proof-led packet",
  }));
}

export function renderInitialOutreachResultsCsv(batchRows) {
  return Papa.unparse(buildInitialOutreachResults(batchRows), {
    columns: RESULT_COLUMNS,
    newline: "\n",
  });
}

export function validateInitialResultsAgainstBatch(resultRows, batchRows) {
  const errors = [];

  if (resultRows.length !== batchRows.length) {
    errors.push(`expected ${batchRows.length} initialized result rows, found ${resultRows.length}`);
  }

  const limit = Math.min(resultRows.length, batchRows.length);
  for (let index = 0; index < limit; index += 1) {
    const rowNumber = index + 1;
    const resultRow = resultRows[index];
    const batchRow = batchRows[index];

    if (resultRow.route_id !== batchRow.route_id) {
      errors.push(`row ${rowNumber} route_id must match batch: ${batchRow.route_id}`);
    }

    if (resultRow.company_or_channel !== batchRow.company_or_channel) {
      errors.push(`row ${rowNumber} company_or_channel must match batch: ${batchRow.company_or_channel}`);
    }

    if (resultRow.tier !== batchRow.tier) {
      errors.push(`row ${rowNumber} tier must match batch: ${batchRow.tier}`);
    }

    if (resultRow.proof_url !== batchRow.proof_url) {
      errors.push(`row ${rowNumber} proof_url must match batch route ${batchRow.route_id}`);
    }

    if (resultRow.file_check_url !== batchRow.file_check_url) {
      errors.push(`row ${rowNumber} file_check_url must match batch route ${batchRow.route_id}`);
    }

    if (resultRow.status !== "not_sent") {
      errors.push(`row ${rowNumber} status must be not_sent in the committed initialized ledger`);
    }
  }

  return [...new Set(errors)];
}

async function main() {
  const batchPath = process.argv[2] ?? DEFAULT_BATCH_PATH;
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT_PATH;
  const batchCsv = await fs.readFile(batchPath, "utf8");
  const batchRows = parseOutreachLedger(batchCsv);
  const ledgerErrors = validateOutreachLedger(batchRows);

  if (ledgerErrors.length > 0) {
    for (const error of ledgerErrors) {
      console.error(`OUTREACH_RESULTS_INIT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const resultRows = buildInitialOutreachResults(batchRows);
  const resultErrors = validateOutreachResults(resultRows);
  const alignmentErrors = validateInitialResultsAgainstBatch(resultRows, batchRows);
  const errors = [...resultErrors, ...alignmentErrors];

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_RESULTS_INIT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(outputPath, `${renderInitialOutreachResultsCsv(batchRows)}\n`, "utf8");
  console.log(`OUTREACH_RESULTS_INIT=pass rows=${resultRows.length} path=${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
