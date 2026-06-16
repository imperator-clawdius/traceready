import fs from "node:fs/promises";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { renderOutreachPacket, validateRenderedOutreachPacket } from "./render-outreach-pack.mjs";
import {
  renderInitialOutreachResultsCsv,
  validateInitialResultsAgainstBatch,
} from "./init-outreach-results.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";

const BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const PACKET_PATH = "docs/proof-led-outreach-send-pack-01.md";
const RESULTS_BATCH_PATH = "docs/proof-led-outreach-results-batch-01.csv";

const csv = await fs.readFile(BATCH_PATH, "utf8");
const rows = parseOutreachLedger(csv);
const ledgerErrors = validateOutreachLedger(rows);

for (const error of ledgerErrors) {
  console.error(`OUTREACH_LEDGER=pending ${error}`);
}

if (ledgerErrors.length === 0) {
  console.log(`OUTREACH_LEDGER=pass rows=${rows.length} path=${BATCH_PATH}`);
}

let packet = "";
try {
  packet = await fs.readFile(PACKET_PATH, "utf8");
} catch {
  console.error(`OUTREACH_PACK=pending missing ${PACKET_PATH}`);
  process.exitCode = 1;
}

if (packet) {
  const packetErrors = validateRenderedOutreachPacket(packet, rows);
  const expectedPacket = `${renderOutreachPacket(rows, { batchPath: BATCH_PATH })}\n`;

  if (packet !== expectedPacket) {
    packetErrors.push("packet is stale; run npm run render:outreach");
  }

  for (const error of packetErrors) {
    console.error(`OUTREACH_PACK=pending ${error}`);
  }

  if (packetErrors.length === 0) {
    console.log(`OUTREACH_PACK=pass rows=${rows.length} path=${PACKET_PATH}`);
  }

  if (packetErrors.length > 0) {
    process.exitCode = 1;
  }
}

let resultsBatch = "";
try {
  resultsBatch = await fs.readFile(RESULTS_BATCH_PATH, "utf8");
} catch {
  console.error(`OUTREACH_RESULTS_INIT=pending missing ${RESULTS_BATCH_PATH}`);
  process.exitCode = 1;
}

if (resultsBatch) {
  const resultRows = parseOutreachResults(resultsBatch);
  const resultErrors = [
    ...validateOutreachResults(resultRows),
    ...validateInitialResultsAgainstBatch(resultRows, rows),
  ];
  const expectedResults = `${renderInitialOutreachResultsCsv(rows)}\n`;

  if (resultsBatch !== expectedResults) {
    resultErrors.push("initialized results ledger is stale; run npm run init:outreach-results");
  }

  for (const error of resultErrors) {
    console.error(`OUTREACH_RESULTS_INIT=pending ${error}`);
  }

  if (resultErrors.length === 0) {
    console.log(`OUTREACH_RESULTS_INIT=pass rows=${resultRows.length} path=${RESULTS_BATCH_PATH}`);
  }

  if (resultErrors.length > 0) {
    process.exitCode = 1;
  }
}

if (ledgerErrors.length > 0) {
  process.exitCode = 1;
}
