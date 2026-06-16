import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-02.csv";
const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_CONCURRENCY = 4;
const CONTACT_WORD_PATTERN = /contact|support|sales|demo|get[-_\s]?in[-_\s]?touch|enquir|inquir|apply/i;
const CAPTCHA_PATTERN = /recaptcha|g-recaptcha|hcaptcha|cf-turnstile|turnstile|captcha/i;

export async function reconOutreachContactRoutes(rows, options = {}) {
  const tier = options.tier;
  const limit = options.limit;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const selectedRows = rows.filter((row) => !tier || row.tier === tier).slice(0, limit ?? rows.length);
  const routes = await mapWithConcurrency(selectedRows, concurrency, (row) =>
    inspectOutreachContactRoute(row, options),
  );

  return {
    batchPath: options.batchPath ?? DEFAULT_BATCH_PATH,
    tier,
    limit,
    routes,
    summary: summarizeRoutes(rows.length, routes, tier, limit),
  };
}

export async function inspectOutreachContactRoute(row, options = {}) {
  const source = await fetchRouteHtml(row.source_url, options);

  if (source.error) {
    return {
      route_id: row.route_id,
      tier: row.tier,
      company_or_channel: row.company_or_channel,
      source_url: row.source_url,
      recon_status: "unreachable",
      status: source.status,
      finalUrl: source.finalUrl,
      note: source.error,
      contactLinks: [],
      mailtoLinks: [],
      formCount: 0,
      hasCaptchaMarker: false,
    };
  }

  const contactLinks = extractContactLinks(source.html, source.finalUrl);
  const mailtoLinks = extractMailtoLinks(source.html);
  const formCount = countForms(source.html);
  const hasCaptchaMarker = CAPTCHA_PATTERN.test(source.html);
  const reconStatus = classifyRoute({ contactLinks, mailtoLinks, formCount, hasCaptchaMarker });

  return {
    route_id: row.route_id,
    tier: row.tier,
    company_or_channel: row.company_or_channel,
    source_url: row.source_url,
    recon_status: reconStatus,
    status: source.status,
    finalUrl: source.finalUrl,
    note: noteForReconStatus(reconStatus),
    contactLinks,
    mailtoLinks,
    formCount,
    hasCaptchaMarker,
  };
}

export async function fetchRouteHtml(sourceUrl, options = {}) {
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
        "user-agent": "TraceReady contact route recon (+https://traceready.online/)",
      },
    });
    const html = await response.text();

    return {
      status: Number(response.status),
      finalUrl: response.url || sourceUrl,
      html,
    };
  } catch (error) {
    return {
      finalUrl: sourceUrl,
      error: error instanceof Error && error.name === "AbortError" ? `timed out after ${timeoutMs}ms` : errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function renderOutreachContactReconJson(recon) {
  return JSON.stringify(recon, null, 2);
}

export function renderOutreachContactReconSummary(recon, reconPath = "") {
  const suffix = reconPath ? ` path=${reconPath}` : "";
  return [
    `OUTREACH_CONTACT_RECON=pass routes=${recon.summary.routesInspected} candidate_browser_form=${recon.summary.candidateBrowserForm} form_with_captcha=${recon.summary.formWithCaptcha} mailto_visible=${recon.summary.mailtoVisible} contact_link_only=${recon.summary.contactLinkOnly} source_only=${recon.summary.sourceOnly} unreachable=${recon.summary.unreachable}${suffix}`,
    "OUTREACH_CONTACT_RECON_NEXT=manually inspect candidate_browser_form and contact_link_only routes before creating a sendability audit",
  ].join("\n");
}

export function parseOutreachContactReconArgs(argv) {
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
    } else if (flag === "--json-output") {
      parsed.jsonOutputPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return parsed;
}

function summarizeRoutes(totalRows, routes, tier, limit) {
  return {
    totalRows,
    routesInspected: routes.length,
    candidateBrowserForm: countByStatus(routes, "candidate_browser_form"),
    formWithCaptcha: countByStatus(routes, "form_with_captcha"),
    mailtoVisible: countByStatus(routes, "mailto_visible"),
    contactLinkOnly: countByStatus(routes, "contact_link_only"),
    sourceOnly: countByStatus(routes, "source_only"),
    unreachable: countByStatus(routes, "unreachable"),
    tier,
    limit,
  };
}

function classifyRoute({ contactLinks, mailtoLinks, formCount, hasCaptchaMarker }) {
  if (formCount > 0 && !hasCaptchaMarker) {
    return "candidate_browser_form";
  }

  if (formCount > 0 && hasCaptchaMarker) {
    return "form_with_captcha";
  }

  if (mailtoLinks.length > 0) {
    return "mailto_visible";
  }

  if (contactLinks.length > 0) {
    return "contact_link_only";
  }

  return "source_only";
}

function noteForReconStatus(status) {
  return {
    candidate_browser_form: "HTML contains a form without an obvious CAPTCHA marker; inspect manually before sendability audit",
    form_with_captcha: "HTML contains a form and CAPTCHA marker; likely blocked or manual-only",
    mailto_visible: "HTML contains a public mailto link; email readiness must be fixed before use",
    contact_link_only: "HTML contains contact-like links; inspect linked route manually",
    source_only: "No form, mailto, or contact-like link found in fetched HTML",
    unreachable: "Source HTML could not be fetched",
  }[status];
}

function extractContactLinks(html, baseUrl) {
  const links = extractAnchorLinks(html, baseUrl).filter((link) => isContactLink(link, baseUrl));
  return dedupeByHref(links).slice(0, 8);
}

function isContactLink(link, baseUrl) {
  if (CONTACT_WORD_PATTERN.test(link.text)) {
    return true;
  }

  if (!CONTACT_WORD_PATTERN.test(link.href)) {
    return false;
  }

  try {
    const linkUrl = new URL(link.href);
    const base = new URL(baseUrl);
    return `${linkUrl.origin}${linkUrl.pathname}` !== `${base.origin}${base.pathname}`;
  } catch {
    return false;
  }
}

function extractMailtoLinks(html) {
  return Array.from(html.matchAll(/href\s*=\s*["']mailto:([^"'?#]+)(?:\?[^"']*)?["']/gi))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 8);
}

function extractAnchorLinks(html, baseUrl) {
  return Array.from(html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      href: resolveHref(match[1], baseUrl),
      text: stripTags(match[2]).replace(/\s+/g, " ").trim(),
    }))
    .filter((link) => link.href && !link.href.startsWith("mailto:"));
}

function countForms(html) {
  return Array.from(html.matchAll(/<form\b/gi)).length;
}

function dedupeByHref(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (seen.has(link.href)) {
      return false;
    }

    seen.add(link.href);
    return true;
  });
}

function resolveHref(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ");
}

function countByStatus(routes, status) {
  return routes.filter((route) => route.recon_status === status).length;
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

function errorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

async function main() {
  const options = parseOutreachContactReconArgs(process.argv.slice(2));
  const csv = await fs.readFile(options.batchPath, "utf8");
  const rows = parseOutreachLedger(csv);
  const errors = validateOutreachLedger(rows);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`OUTREACH_CONTACT_RECON=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const recon = await reconOutreachContactRoutes(rows, options);

  if (options.jsonOutputPath) {
    await fs.mkdir(path.dirname(options.jsonOutputPath), { recursive: true });
    await fs.writeFile(options.jsonOutputPath, `${renderOutreachContactReconJson(recon)}\n`, "utf8");
  }

  console.log(renderOutreachContactReconSummary(recon, options.jsonOutputPath));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`OUTREACH_CONTACT_RECON=pending ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
