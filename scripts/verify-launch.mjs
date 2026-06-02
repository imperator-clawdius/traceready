import { resolve4, resolveCname } from "node:dns/promises";
import http from "node:http";
import https from "node:https";

const EXPECTED_APEX_A = ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"];
const EXPECTED_WWW_CNAME = "imperator-clawdius.github.io";
const GITHUB_PAGES_IP = "185.199.108.153";
const DOMAIN = "traceready.online";
const WWW_DOMAIN = `www.${DOMAIN}`;
const STRIPE_LINK = "https://buy.stripe.com/4gMbJ1d4Tate2L531O8IU01";
const STRICT_DNS = process.argv.includes("--strict-dns");

const requiredPages = [
  {
    label: "APP_ROOT",
    path: "/",
    content: ["TraceReady", "Sample CSV", "Sample KML", "Sample GeoJSON", STRIPE_LINK, "Send paid-cleanup file"],
  },
  {
    label: "PRIVACY_PAGE",
    path: "/privacy/",
    content: ["Privacy", "browser", "paid cleanup", "Stripe"],
  },
  {
    label: "TERMS_PAGE",
    path: "/terms/",
    content: ["Terms", "No legal certification", "Paid cleanup", "Buy cleanup - $149"],
  },
];

async function main() {
  const [apexRecords, wwwCname, pageResults, stripeLink] = await Promise.all([
    resolveA(DOMAIN),
    resolveCnameRecord(WWW_DOMAIN),
    Promise.all(requiredPages.map((page) => fetchGitHubPagesArtifact(page))),
    head(STRIPE_LINK),
  ]);

  const apexReady = EXPECTED_APEX_A.every((ip) => apexRecords.includes(ip));
  const wwwReady = wwwCname.includes(EXPECTED_WWW_CNAME);
  const dnsReady = apexReady && wwwReady;
  const pageChecks = pageResults.map((result) => ({
    ...result,
    ready: result.status === 200 && result.content.every((text) => result.body.includes(text)),
    missing: result.content.filter((text) => !result.body.includes(text)),
  }));
  const appReady = pageChecks.every((check) => check.ready);
  const stripeReady = stripeLink.status >= 200 && stripeLink.status < 400;

  for (const check of pageChecks) {
    printStatus(check.label, check.ready, `status=${check.status} path=${check.path} host=${DOMAIN} via=${GITHUB_PAGES_IP}`);
  }

  printStatus("STRIPE_LINK", stripeReady, `status=${stripeLink.status} url=${STRIPE_LINK}`);
  printStatus("DNS_APEX", apexReady, `current=${apexRecords.join(",") || "none"}`);
  printStatus("DNS_WWW", wwwReady, `current=${wwwCname.join(",") || "none"}`);
  console.log(`CLAIMED_DOMAIN_READY=${dnsReady}`);

  for (const check of pageChecks) {
    if (!check.ready) {
      console.log(`${check.label}_MISSING=${check.missing.join(",") || "none"}`);
    }
  }

  if (!dnsReady) {
    console.log("DNS_REQUIRED=");
    console.log("  A     @     185.199.108.153");
    console.log("  A     @     185.199.109.153");
    console.log("  A     @     185.199.110.153");
    console.log("  A     @     185.199.111.153");
    console.log("  CNAME www   imperator-clawdius.github.io");
  }

  if (!appReady || !stripeReady || (STRICT_DNS && !dnsReady)) {
    process.exitCode = 1;
  }
}

async function resolveA(hostname) {
  try {
    return await resolve4(hostname);
  } catch {
    return [];
  }
}

async function resolveCnameRecord(hostname) {
  try {
    return await resolveCname(hostname);
  } catch {
    return [];
  }
}

async function fetchGitHubPagesArtifact(page) {
  return new Promise((resolve) => {
    const request = http.request(
      {
        host: GITHUB_PAGES_IP,
        path: page.path,
        method: "GET",
        headers: {
          Host: DOMAIN,
        },
        timeout: 15000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ ...page, status: response.statusCode ?? 0, body });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ ...page, status: 0, body: "" });
    });
    request.on("error", () => {
      resolve({ ...page, status: 0, body: "" });
    });
    request.end();
  });
}

async function head(url) {
  return new Promise((resolve) => {
    const request = https.request(url, { method: "HEAD", timeout: 15000 }, (response) => {
      resolve({ status: response.statusCode ?? 0 });
    });

    request.on("timeout", () => {
      request.destroy();
      resolve({ status: 0 });
    });
    request.on("error", () => {
      resolve({ status: 0 });
    });
    request.end();
  });
}

function printStatus(label, ok, detail) {
  console.log(`${label}=${ok ? "pass" : "pending"} ${detail}`);
}

await main();
