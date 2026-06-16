import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderInitialOutreachResultsCsv,
  validateInitialResultsAgainstBatch,
} from "./init-outreach-results.mjs";
import { renderOutreachDayPack, validateOutreachDayPackInputs } from "./render-outreach-day-pack.mjs";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_PUBLIC_RESULTS_PATH = "docs/proof-led-outreach-results-batch-01.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-01.csv";
const DEFAULT_DAY_PACK_PATH = "private/outreach-day-pack.md";
const DEFAULT_SEND_LIMIT = 8;
const DEFAULT_FOLLOW_UP_AFTER_DAYS = 4;

export async function prepareOutreachWorkspace(options = {}) {
  const preparedOptions = normalizeOptions(options);
  const batchCsv = await fs.readFile(preparedOptions.batchPath, "utf8");
  const batchRows = parseOutreachLedger(batchCsv);
  const ledgerErrors = validateOutreachLedger(batchRows);

  if (ledgerErrors.length > 0) {
    throw new Error(ledgerErrors.join("; "));
  }

  const { resultsCsv, resultsCreated } = await readOrCreatePrivateResults(preparedOptions, batchRows);
  const resultRows = parseOutreachResults(resultsCsv);
  const resultErrors = [
    ...validateOutreachResults(resultRows),
    ...validateOutreachDayPackInputs(batchRows, resultRows),
  ];

  if (resultErrors.length > 0) {
    throw new Error(resultErrors.join("; "));
  }

  const dayPack = `${renderOutreachDayPack(batchRows, resultRows, {
    batchPath: preparedOptions.batchPath,
    resultsPath: preparedOptions.resultsPath,
    today: preparedOptions.today,
    sendLimit: preparedOptions.sendLimit,
    followUpAfterDays: preparedOptions.followUpAfterDays,
  })}\n`;

  await ensureParentDir(preparedOptions.dayPackPath);
  await fs.writeFile(preparedOptions.dayPackPath, dayPack, "utf8");

  return {
    resultsCreated,
    resultsPath: preparedOptions.resultsPath,
    dayPackPath: preparedOptions.dayPackPath,
    rows: resultRows.length,
    today: preparedOptions.today,
    sendLimit: preparedOptions.sendLimit,
  };
}

export function parsePrepareOutreachWorkspaceArgs(argv) {
  const args = [...argv];
  const parsed = normalizeOptions({});

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
    } else if (flag === "--public-results") {
      parsed.publicResultsPath = value;
    } else if (flag === "--results") {
      parsed.resultsPath = value;
    } else if (flag === "--day-pack") {
      parsed.dayPackPath = value;
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

async function readOrCreatePrivateResults(options, batchRows) {
  if (await fileExists(options.resultsPath)) {
    return {
      resultsCsv: await fs.readFile(options.resultsPath, "utf8"),
      resultsCreated: false,
    };
  }

  const publicResultsCsv = await fs.readFile(options.publicResultsPath, "utf8");
  const publicRows = parseOutreachResults(publicResultsCsv);
  const publicErrors = [
    ...validateOutreachResults(publicRows),
    ...validateInitialResultsAgainstBatch(publicRows, batchRows),
  ];

  if (publicErrors.length > 0) {
    throw new Error(publicErrors.join("; "));
  }

  const expectedPublicCsv = `${renderInitialOutreachResultsCsv(batchRows)}\n`;
  if (publicResultsCsv !== expectedPublicCsv) {
    throw new Error("public initialized results ledger is stale; run npm run init:outreach-results");
  }

  await ensureParentDir(options.resultsPath);
  await fs.writeFile(options.resultsPath, publicResultsCsv, "utf8");

  return {
    resultsCsv: publicResultsCsv,
    resultsCreated: true,
  };
}

function normalizeOptions(options) {
  return {
    batchPath: options.batchPath ?? DEFAULT_BATCH_PATH,
    publicResultsPath: options.publicResultsPath ?? DEFAULT_PUBLIC_RESULTS_PATH,
    resultsPath: options.resultsPath ?? DEFAULT_RESULTS_PATH,
    dayPackPath: options.dayPackPath ?? DEFAULT_DAY_PACK_PATH,
    today: options.today ?? todayIsoDate(),
    sendLimit: options.sendLimit ?? DEFAULT_SEND_LIMIT,
    followUpAfterDays: options.followUpAfterDays ?? DEFAULT_FOLLOW_UP_AFTER_DAYS,
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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
  const options = parsePrepareOutreachWorkspaceArgs(process.argv.slice(2));
  const result = await prepareOutreachWorkspace(options);
  console.log(
    [
      "OUTREACH_PREP=pass",
      `rows=${result.rows}`,
      `results=${result.resultsPath}`,
      `results_created=${result.resultsCreated}`,
      `day_pack=${result.dayPackPath}`,
      `today=${result.today}`,
      `send_limit=${result.sendLimit}`,
    ].join(" "),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_PREP=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
