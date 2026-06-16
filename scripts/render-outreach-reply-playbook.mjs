import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-01.csv";

export function renderOutreachReplyPlaybook(rows, options = {}) {
  const batchPath = options.batchPath ?? DEFAULT_BATCH_PATH;
  const resultsPath = options.resultsPath ?? DEFAULT_RESULTS_PATH;
  const routeId = options.routeId;
  const row = rows.find((candidate) => candidate.route_id === routeId);

  if (!row) {
    throw new Error(`route ${routeId} is missing from the outreach batch`);
  }

  const triageUrl = trackedTriageUrl(row.file_check_url);

  return [
    "# TraceReady reply playbook",
    "",
    `Batch: \`${batchPath}\``,
    `Results: \`${resultsPath}\``,
    `Route: ${row.route_id} - ${row.company_or_channel}`,
    `Tier: ${row.tier}`,
    `Proof URL: ${row.proof_url}`,
    `Field note URL: ${row.field_note_url}`,
    `File check URL: ${row.file_check_url}`,
    `Triage URL: ${triageUrl}`,
    "",
    "Use company-level reply routes only. Do not paste personal names, direct emails, private reply text, customer files, or raw coordinates into committed files.",
    "",
    ...renderReplyBlock({
      title: "Who are you?",
      body: [
        `Fair question. I am the operator behind TraceReady, a narrow cleanup desk for coffee and cocoa CSV/KML/GeoJSON handoff files.`,
        "",
        "I am not asking you to trust credentials first. Start with the public pilot case or run one file browser-side before sending me anything.",
        "",
        `Public pilot case: ${row.proof_url}`,
        `Browser-side file check: ${row.file_check_url}`,
      ],
      command: updateCommand(resultsPath, row.route_id, {
        status: "replied",
        response_type: "question",
        reply_notes: "objection: who are you",
        next_action: "send proof page and ask for one browser-side check",
      }),
    }),
    ...renderReplyBlock({
      title: "We cannot send coordinates",
      body: [
        "Understood. Coordinates do not need to leave your machine for the first issue list.",
        "",
        `You can run the file in the browser here: ${row.file_check_url}`,
        "",
        `If even that is too much, send only non-sensitive issue counts, field names, commodity, source country, buyer deadline, and a sample row shape through triage: ${triageUrl}`,
      ],
      command: updateCommand(resultsPath, row.route_id, {
        status: "replied",
        response_type: "question",
        reply_notes: "objection: cannot share coordinates",
        next_action: "send browser-side check and triage route",
      }),
    }),
    ...renderReplyBlock({
      title: "We already use an EUDR platform",
      body: [
        "That is fine. TraceReady sits before the platform when supplier files are malformed and need row-level cleanup.",
        "",
        "The narrow question is whether the source CSV/KML/GeoJSON will create buyer-review or platform-ingestion rework before your main compliance workflow starts.",
        "",
        `The public file-defect example is here: ${row.field_note_url}`,
      ],
      command: updateCommand(resultsPath, row.route_id, {
        status: "replied",
        response_type: "question",
        reply_notes: "objection: existing platform",
        next_action: "position as pre-platform cleanup",
      }),
    }),
    ...renderReplyBlock({
      title: "Can you certify this?",
      body: [
        "No. TraceReady is operational cleanup and readiness checking, not legal certification, DDS filing, or deforestation-free proof.",
        "",
        "The useful output is a cleaned pack, row-level issue log, normalized GeoJSON, and buyer summary so the real compliance owner can review better source data.",
      ],
      command: updateCommand(resultsPath, row.route_id, {
        status: "disqualified",
        response_type: "disqualified",
        reply_notes: "objection: wants certification",
        next_action: "disqualify unless they need operational cleanup",
      }),
    }),
    ...renderReplyBlock({
      title: "Useful, we ran a file",
      body: [
        "If the issue list was useful, the next concrete step is one cleaned buyer pack and row-level issue log.",
        "",
        "I can keep this narrow: one source file or one clearly related shipment pack, cleaned CSV, issue log, normalized GeoJSON, and buyer summary.",
        "",
        "If you want that pass, send the source format, commodity, source country, buyer deadline, and any buyer requirements through the order-intake route.",
      ],
      command: updateCommand(resultsPath, row.route_id, {
        status: "file_checked",
        response_type: "file_check",
        file_check_count: 1,
        reply_notes: "route-stamped buyer summary received",
        next_action: "ask whether they want the cleaned pack",
      }),
    }),
  ].join("\n");
}

export function validateOutreachReplyPlaybookInputs(rows, options = {}) {
  const errors = [];

  if (!options.routeId) {
    errors.push("--route is required");
  } else if (!rows.some((row) => row.route_id === options.routeId)) {
    errors.push(`route ${options.routeId} is missing from the outreach batch`);
  }

  return errors;
}

export function parseOutreachReplyPlaybookArgs(argv) {
  const args = [...argv];
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
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
    } else if (flag === "--route") {
      parsed.routeId = value;
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function renderReplyBlock({ title, body, command }) {
  return [
    `## ${title}`,
    "",
    "```text",
    ...body,
    "```",
    "",
    `Log this path: \`${command}\``,
    "",
  ];
}

function trackedTriageUrl(fileCheckUrl) {
  const url = new URL(fileCheckUrl);
  return `/file-triage/?${url.searchParams.toString()}`;
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

async function main() {
  const options = parseOutreachReplyPlaybookArgs(process.argv.slice(2));
  const csv = await fs.readFile(options.batchPath, "utf8");
  const rows = parseOutreachLedger(csv);
  const errors = [
    ...validateOutreachLedger(rows),
    ...validateOutreachReplyPlaybookInputs(rows, options),
  ];

  if (errors.length > 0) {
    for (const error of [...new Set(errors)]) {
      console.error(`OUTREACH_REPLY_PLAYBOOK=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = `${renderOutreachReplyPlaybook(rows, options)}\n`;

  if (options.outputPath) {
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, markdown, "utf8");
    console.log(`OUTREACH_REPLY_PLAYBOOK=pass path=${options.outputPath}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_REPLY_PLAYBOOK=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
