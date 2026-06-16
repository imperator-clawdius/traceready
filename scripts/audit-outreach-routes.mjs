import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_CONCURRENCY = 4;
const MANUAL_CHECK_STATUSES = new Set([401, 403, 405, 429]);

export async function auditOutreachRoutes(rows, options = {}) {
  const tier = options.tier;
  const limit = options.limit;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const selectedRows = rows.filter((row) => !tier || row.tier === tier).slice(0, limit ?? rows.length);
  const routes = await mapWithConcurrency(selectedRows, concurrency, async (row) => {
    const check = options.checkRoute
      ? await options.checkRoute(row)
      : await checkOutreachRoute(row.source_url, {
          timeoutMs: options.timeoutMs,
          fetchImpl: options.fetchImpl,
        });

    return {
      route_id: row.route_id,
      tier: row.tier,
      company_or_channel: row.company_or_channel,
      public_route: row.public_route,
      source_url: row.source_url,
      ...check,
    };
  });

  return {
    batchPath: options.batchPath ?? DEFAULT_BATCH_PATH,
    tier,
    limit,
    routes,
    summary: {
      totalRows: rows.length,
      auditedRows: routes.length,
      reachable: routes.filter((route) => route.health === "reachable").length,
      manualCheck: routes.filter((route) => route.health === "manual_check").length,
      unreachable: routes.filter((route) => route.health === "unreachable").length,
      tier,
      limit,
    },
  };
}

export async function checkOutreachRoute(sourceUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "TraceReady route audit (+https://traceready.online/)",
      },
    });
    const status = Number(response.status);

    return {
      health: healthForStatus(status),
      status,
      finalUrl: response.url || sourceUrl,
      note: noteForStatus(status),
    };
  } catch (error) {
    return {
      health: "unreachable",
      status: undefined,
      finalUrl: sourceUrl,
      note: error instanceof Error && error.name === "AbortError" ? `timed out after ${timeoutMs}ms` : errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function renderOutreachRouteAudit(audit) {
  return [
    "# TraceReady outreach route audit",
    "",
    `Batch: \`${audit.batchPath}\``,
    ...(audit.tier ? [`Tier filter: ${audit.tier}`] : []),
    ...(audit.limit ? [`Limit: ${audit.limit}`] : []),
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Rows in batch | ${audit.summary.totalRows} |`,
    `| Routes audited | ${audit.summary.auditedRows} |`,
    `| Reachable | ${audit.summary.reachable} |`,
    `| Manual check | ${audit.summary.manualCheck} |`,
    `| Unreachable | ${audit.summary.unreachable} |`,
    "",
    "| Route | Tier | Company/channel | Health | Status | Source URL | Note |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
    ...audit.routes.map(
      (route) =>
        `| ${route.route_id} | ${route.tier} | ${escapeCell(route.company_or_channel)} | ${route.health} | ${route.status ?? ""} | ${route.source_url} | ${escapeCell(route.note)} |`,
    ),
    "",
    "## Decision",
    "",
    "Send first through reachable routes, then manually inspect blocked routes before skipping them.",
    "Treat unreachable routes as source-list maintenance, not product traction evidence.",
    "",
  ].join("\n");
}

export function parseOutreachRouteAuditArgs(argv) {
  const args = [...argv];
  const parsed = {
    batchPath: DEFAULT_BATCH_PATH,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
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
    } else if (flag === "--tier") {
      parsed.tier = value;
    } else if (flag === "--timeout-ms") {
      parsed.timeoutMs = parsePositiveInteger(value, flag);
    } else if (flag === "--limit") {
      parsed.limit = parsePositiveInteger(value, flag);
    } else if (flag === "--concurrency") {
      parsed.concurrency = parsePositiveInteger(value, flag);
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function healthForStatus(status) {
  if (status >= 200 && status < 400) {
    return "reachable";
  }

  if (MANUAL_CHECK_STATUSES.has(status)) {
    return "manual_check";
  }

  return "unreachable";
}

function noteForStatus(status) {
  if (MANUAL_CHECK_STATUSES.has(status)) {
    return `HTTP ${status} blocks CLI fetch; inspect manually before sending`;
  }

  return `HTTP ${status}`;
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function errorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function parsePositiveInteger(value, flag) {
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return Number(value);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  const options = parseOutreachRouteAuditArgs(process.argv.slice(2));
  const csv = await fs.readFile(options.batchPath, "utf8");
  const rows = parseOutreachLedger(csv);
  const errors = validateOutreachLedger(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_ROUTE_AUDIT=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const audit = await auditOutreachRoutes(rows, options);
  console.log(renderOutreachRouteAudit(audit));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_ROUTE_AUDIT=pending ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
