import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import {
  assertSafeResultsPath,
  renderUpdatedOutreachResultsCsv,
  updateOutreachResult,
} from "./update-outreach-result.mjs";

const DEFAULT_OUTPUT_DIR = "private";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PERSONAL_PROFILE_PATTERN =
  /(?:linkedin\.com\/in\/|facebook\.com\/people\/|instagram\.com\/p\/|x\.com\/[^/\s]+\/status\/)/i;

export function parseSubmissionEvidenceArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (flag === "--confirm-visible-success") {
      options.confirmedVisibleSuccess = true;
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--results") {
      options.resultsPath = value;
    } else if (flag === "--route") {
      options.routeId = value;
    } else if (flag === "--submitted-at") {
      options.submittedAt = value;
    } else if (flag === "--success-url") {
      options.successUrl = value;
    } else if (flag === "--success-text") {
      options.successText = value;
    } else if (flag === "--output") {
      options.outputPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!options.resultsPath) {
    throw new Error("missing --results path/to/private-results.csv");
  }

  if (!options.routeId) {
    throw new Error("missing --route b01-rNN");
  }

  options.outputPath ??= path.join(DEFAULT_OUTPUT_DIR, `submission-evidence-${options.routeId}.json`);

  return options;
}

export async function recordSubmissionEvidence(options = {}) {
  const resultsPath = options.resultsPath;
  const routeId = options.routeId;
  const outputPath = options.outputPath ?? path.join(DEFAULT_OUTPUT_DIR, `submission-evidence-${routeId}.json`);

  if (!resultsPath) {
    throw new Error("resultsPath is required");
  }

  if (!routeId) {
    throw new Error("routeId is required");
  }

  assertSafeResultsPath(resultsPath);

  const rows = parseOutreachResults(await fs.readFile(resultsPath, "utf8"));
  const row = rows.find((nextRow) => nextRow.route_id === routeId);

  if (!row) {
    throw new Error(`route ${routeId} was not found in results ledger`);
  }

  const evidence = buildSubmissionEvidence({
    routeId,
    companyOrChannel: row.company_or_channel,
    submittedAt: options.submittedAt,
    successUrl: options.successUrl,
    successText: options.successText,
    confirmedVisibleSuccess: options.confirmedVisibleSuccess,
  });
  const evidenceFileName = path.basename(outputPath);
  const updatedRows = updateOutreachResult(rows, routeId, {
    date_sent: evidence.submittedAt.slice(0, 10),
    status: "sent",
    response_type: "none",
    reply_notes: `public form submitted; visible form success observed; submission evidence: ${evidenceFileName}`,
    next_action: "watch for reply; follow up after 4 business days if no response",
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await fs.writeFile(resultsPath, `${renderUpdatedOutreachResultsCsv(updatedRows)}\n`, "utf8");

  return {
    routeId,
    resultsPath,
    outputPath,
    evidence,
  };
}

export function buildSubmissionEvidence({
  routeId,
  companyOrChannel,
  submittedAt = new Date().toISOString(),
  successUrl,
  successText,
  confirmedVisibleSuccess = false,
} = {}) {
  if (!confirmedVisibleSuccess) {
    throw new Error("visible success confirmation is required");
  }

  if (!routeId) {
    throw new Error("routeId is required");
  }

  if (!companyOrChannel) {
    throw new Error("companyOrChannel is required");
  }

  if (!submittedAt || Number.isNaN(Date.parse(submittedAt))) {
    throw new Error("submittedAt must be a valid ISO timestamp");
  }

  if (!successUrl || !/^https?:\/\//i.test(successUrl)) {
    throw new Error("successUrl must be an http or https URL");
  }

  if (!successText || !String(successText).trim()) {
    throw new Error("successText is required");
  }

  if (EMAIL_PATTERN.test(successText)) {
    throw new Error("successText must not contain email addresses");
  }

  if (PERSONAL_PROFILE_PATTERN.test(successText)) {
    throw new Error("successText must not contain personal-profile URLs");
  }

  return {
    routeId,
    companyOrChannel,
    submittedAt: new Date(submittedAt).toISOString(),
    successUrl,
    visibleSuccessObserved: true,
    successText: String(successText).trim(),
  };
}

async function main() {
  const options = parseSubmissionEvidenceArgs(process.argv.slice(2));
  const result = await recordSubmissionEvidence(options);

  console.log(
    [
      "SUBMISSION_EVIDENCE=pass",
      `route=${result.routeId}`,
      `results=${result.resultsPath}`,
      `output=${result.outputPath}`,
    ].join(" "),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`SUBMISSION_EVIDENCE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
