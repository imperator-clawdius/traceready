import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_AUDIT_PATH = "private/outreach-sendability-audit-importer.json";
const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-01.csv";
const ALLOWED_SENDABILITY = new Set(["browser_form_ready", "blocked"]);
const ALLOWED_CONTACT_METHODS = new Set(["public_browser_form", "public_browser_page", "mailto_only"]);

export function validateOutreachSendabilityAudit(audit, batchRows, resultRows) {
  const errors = [];

  if (!audit || typeof audit !== "object" || !Array.isArray(audit.routes)) {
    return ["sendability audit must contain a routes array"];
  }

  if (audit.routes.length === 0) {
    errors.push("sendability audit must contain at least one route");
  }

  const batchByRoute = new Map(batchRows.map((row) => [row.route_id, row]));
  const resultsByRoute = new Map(resultRows.map((row) => [row.route_id, row]));
  const seenRouteIds = new Set();

  for (const route of audit.routes) {
    const routeId = route?.route_id;
    const routeLabel = typeof routeId === "string" && routeId.trim() ? routeId : "route without route_id";

    if (!routeId || typeof routeId !== "string") {
      errors.push("sendability route is missing route_id");
      continue;
    }

    if (seenRouteIds.has(routeId)) {
      errors.push(`${routeId} appears more than once in the sendability audit`);
    }
    seenRouteIds.add(routeId);

    if (!batchByRoute.has(routeId)) {
      errors.push(`${routeId} is not in the outreach batch`);
    }

    if (!resultsByRoute.has(routeId)) {
      errors.push(`${routeId} is not in the private results ledger`);
    }

    if (!isHttpUrl(route.route_url)) {
      errors.push(`${routeLabel} route_url must be an http(s) URL`);
    }

    if (!ALLOWED_SENDABILITY.has(route.sendability)) {
      errors.push(`${routeLabel} sendability must be one of ${[...ALLOWED_SENDABILITY].join(", ")}`);
    }

    if (!ALLOWED_CONTACT_METHODS.has(route.contact_method)) {
      errors.push(`${routeLabel} contact_method must be one of ${[...ALLOWED_CONTACT_METHODS].join(", ")}`);
    }

    if (route.sendability === "browser_form_ready") {
      if (route.contact_method !== "public_browser_form") {
        errors.push(`${routeId} browser_form_ready routes must use contact_method=public_browser_form`);
      }

      if (route.requires_action_time_confirmation !== true) {
        errors.push(`${routeId} browser_form_ready routes must set requires_action_time_confirmation=true`);
      }
    }

    if (route.sendability === "blocked" && !hasText(route.blocker)) {
      errors.push(`${routeId} blocked routes must include blocker text`);
    }
  }

  if (!audit.routes.some((route) => route.sendability === "browser_form_ready")) {
    errors.push("sendability audit must include at least one browser_form_ready route");
  }

  return errors;
}

export function renderOutreachSendabilityAuditSummary(audit, auditPath = DEFAULT_AUDIT_PATH) {
  const routes = Array.isArray(audit?.routes) ? audit.routes : [];
  const browserFormReady = routes.filter((route) => route.sendability === "browser_form_ready").length;
  const blocked = routes.filter((route) => route.sendability === "blocked").length;

  return `OUTREACH_SENDABILITY_AUDIT=pass routes=${routes.length} browser_form_ready=${browserFormReady} blocked=${blocked} path=${auditPath}`;
}

export function parseOutreachSendabilityArgs(argv) {
  const args = [...argv];
  const parsed = {
    auditPath: DEFAULT_AUDIT_PATH,
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

    if (flag === "--audit") {
      parsed.auditPath = value;
    } else if (flag === "--batch") {
      parsed.batchPath = value;
    } else if (flag === "--results") {
      parsed.resultsPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function isHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function main() {
  const options = parseOutreachSendabilityArgs(process.argv.slice(2));
  const [auditJson, batchCsv, resultsCsv] = await Promise.all([
    fs.readFile(options.auditPath, "utf8"),
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
  ]);
  const audit = JSON.parse(auditJson);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const errors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachSendabilityAudit(audit, batchRows, resultRows),
  ];

  for (const error of [...new Set(errors)]) {
    console.error(`OUTREACH_SENDABILITY_AUDIT=pending ${error}`);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(renderOutreachSendabilityAuditSummary(audit, options.auditPath));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_SENDABILITY_AUDIT=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
