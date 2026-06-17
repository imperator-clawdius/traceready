import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_QUEUE_PATH = "private/preflight-submit-queue.md";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-batch-02.json";
const DEFAULT_OUTPUT_PATH = "private/submit-route-live-check.md";
const DEFAULT_TIMEOUT_MS = 12000;
const ROUTE_ID_PATTERN = /^b\d{2}-r\d{2}$/;
const CAPTCHA_PATTERN =
  /(g-recaptcha|hcaptcha|cf-turnstile|data-sitekey|captcha|checking your browser|cloudflare challenge)/i;
const FORM_MARKER_PATTERN = /(<form\b|<input\b|gform_|pardot|kadence|hubspot|marketo|contact)/i;

export function parseSubmitQueueRoutes(markdown) {
  return String(markdown ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("| `b"))
    .map((line) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => stripBackticks(cell.trim()));

      return {
        route_id: cells[0],
        company_or_channel: cells[1],
        route_url: cells[2],
        send_ready_path: cells[3],
        preflight_path: cells[4],
        reply_capture: cells[5],
      };
    })
    .filter((route) => ROUTE_ID_PATTERN.test(route.route_id));
}

export async function inspectLiveSubmitRoutes({
  queueMarkdown,
  sendabilityAudit,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required");
  }

  const queueRoutes = parseSubmitQueueRoutes(queueMarkdown);
  const queueByRoute = new Map(queueRoutes.map((route) => [route.route_id, route]));
  const readyRoutes = (sendabilityAudit.routes ?? []).filter((route) => route.sendability === "browser_form_ready");
  const routeReports = [];
  const missingQueueRoutes = [];
  const staleQueueRoutes = [];
  const blockedRoutes = [];
  const captchaRoutes = [];
  const fetchErrorRoutes = [];
  const noFormMarkerRoutes = [];
  const replyCaptureRiskRoutes = [];

  for (const readyRoute of readyRoutes) {
    const queueRoute = queueByRoute.get(readyRoute.route_id);

    if (!queueRoute) {
      missingQueueRoutes.push(readyRoute.route_id);
      routeReports.push({
        route_id: readyRoute.route_id,
        company_or_channel: readyRoute.company_or_channel,
        route_url: readyRoute.route_url,
        statusCode: "missing_queue",
        status: "pending",
        issue: "missing from private submit queue",
      });
      continue;
    }

    const stale = normalizeUrl(queueRoute.route_url) !== normalizeUrl(readyRoute.route_url);
    if (stale) {
      staleQueueRoutes.push(readyRoute.route_id);
    }

    const fetchTarget = queueRoute.route_url || readyRoute.route_url;
    const response = await fetchRoute(fetchImpl, fetchTarget, timeoutMs);
    const body = response.body ?? "";
    const hasCaptcha = CAPTCHA_PATTERN.test(body);
    const hasFormMarker = FORM_MARKER_PATTERN.test(body);
    const replyCaptureReady = queueRoute.reply_capture === "ready";
    let status = "pass";
    const issues = [];

    if (!replyCaptureReady) {
      status = "pending";
      replyCaptureRiskRoutes.push(readyRoute.route_id);
      issues.push("reply capture not ready");
    }

    if (stale) {
      status = "pending";
      issues.push("queue URL differs from sendability audit");
    }

    if (response.error) {
      status = "pending";
      fetchErrorRoutes.push(readyRoute.route_id);
      issues.push(response.error);
    } else if (response.statusCode < 200 || response.statusCode >= 400) {
      status = "pending";
      blockedRoutes.push(readyRoute.route_id);
      issues.push(`HTTP ${response.statusCode}`);
    }

    if (hasCaptcha) {
      status = "pending";
      captchaRoutes.push(readyRoute.route_id);
      issues.push("CAPTCHA or browser-challenge marker found");
    }

    if (!hasFormMarker) {
      noFormMarkerRoutes.push(readyRoute.route_id);
      issues.push("no form marker found in fetched HTML");
    }

    routeReports.push({
      route_id: readyRoute.route_id,
      company_or_channel: readyRoute.company_or_channel ?? queueRoute.company_or_channel,
      route_url: fetchTarget,
      statusCode: response.statusCode,
      status,
      issue: issues.join("; ") || "reachable without CAPTCHA markers",
    });
  }

  const liveReadyRoutes = routeReports.filter((route) => route.status === "pass").length;
  const blockingCount =
    missingQueueRoutes.length +
    staleQueueRoutes.length +
    blockedRoutes.length +
    captchaRoutes.length +
    fetchErrorRoutes.length +
    replyCaptureRiskRoutes.length;

  return {
    status: blockingCount === 0 ? "pass" : "pending",
    readyRoutes: readyRoutes.length,
    liveReadyRoutes,
    missingQueueRoutes,
    staleQueueRoutes,
    blockedRoutes,
    captchaRoutes,
    fetchErrorRoutes,
    noFormMarkerRoutes,
    replyCaptureRiskRoutes,
    routeReports,
  };
}

export function renderLiveSubmitRouteReport(report, options = {}) {
  const generatedAt = options.generatedAt ?? todayIsoDate();
  const routeRows = report.routeReports.map(
    (route) =>
      `| \`${route.route_id}\` | ${route.company_or_channel} | \`${route.statusCode}\` | ${route.status} | ${route.issue} | ${route.route_url} |`,
  );

  return `# TraceReady live submit route check - ${generatedAt}

OUTREACH_SUBMIT_LIVE=${report.status} ready_routes=${report.readyRoutes} live_ready=${report.liveReadyRoutes} blocked=${report.blockedRoutes.length} captcha=${report.captchaRoutes.length}

## Route Checks

| Route | Target | HTTP | Status | Issue | URL |
| --- | --- | ---: | --- | --- | --- |
${routeRows.join("\n")}

## Blocking Sets

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | ${formatRouteSet(report.missingQueueRoutes)} |
| Queue URL differs from sendability audit | ${formatRouteSet(report.staleQueueRoutes)} |
| Fetch errors | ${formatRouteSet(report.fetchErrorRoutes)} |
| HTTP blocked | ${formatRouteSet(report.blockedRoutes)} |
| CAPTCHA or browser challenge marker | ${formatRouteSet(report.captchaRoutes)} |
| Reply capture not ready | ${formatRouteSet(report.replyCaptureRiskRoutes)} |
| No form marker found | ${formatRouteSet(report.noFormMarkerRoutes)} |

## Rule

Run this immediately before using the submit queue. External form submission still requires explicit action-time confirmation and visible browser success evidence before logging a route as sent.
`;
}

export function parseSubmitRouteLiveArgs(argv) {
  const parsed = {
    queuePath: DEFAULT_QUEUE_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    generatedAt: todayIsoDate(),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--queue") {
      parsed.queuePath = value;
    } else if (flag === "--sendability-audit") {
      parsed.sendabilityAuditPath = value;
    } else if (flag === "--output") {
      parsed.outputPath = value;
    } else if (flag === "--today") {
      parsed.generatedAt = value;
    } else if (flag === "--timeout-ms") {
      parsed.timeoutMs = Number(value);
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive number");
  }

  return parsed;
}

function stripBackticks(value) {
  return value.replace(/^`|`$/g, "");
}

function normalizeUrl(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

async function fetchRoute(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "user-agent":
          "TraceReady live route precheck (+https://traceready.online; operational readiness verification)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();

    return {
      statusCode: response.status,
      url: response.url || url,
      body,
    };
  } catch (error) {
    return {
      statusCode: "fetch_error",
      url,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatRouteSet(routeIds) {
  return routeIds.length ? routeIds.map((routeId) => `\`${routeId}\``).join(", ") : "none";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const options = parseSubmitRouteLiveArgs(process.argv.slice(2));
  const [queueMarkdown, auditJson] = await Promise.all([
    fs.readFile(options.queuePath, "utf8"),
    fs.readFile(options.sendabilityAuditPath, "utf8"),
  ]);
  const report = await inspectLiveSubmitRoutes({
    queueMarkdown,
    sendabilityAudit: JSON.parse(auditJson),
    timeoutMs: options.timeoutMs,
  });
  const markdown = renderLiveSubmitRouteReport(report, { generatedAt: options.generatedAt });

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.writeFile(options.outputPath, markdown, "utf8");

  console.log(
    `OUTREACH_SUBMIT_LIVE=${report.status} ready_routes=${report.readyRoutes} live_ready=${report.liveReadyRoutes} blocked=${report.blockedRoutes.length} captcha=${report.captchaRoutes.length} output=${options.outputPath}`,
  );

  if (report.status !== "pass") {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_SUBMIT_LIVE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
