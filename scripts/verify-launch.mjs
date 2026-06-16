import { resolve4, resolveCname } from "node:dns/promises";
import http from "node:http";
import https from "node:https";

const EXPECTED_APEX_A = ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"];
const EXPECTED_WWW_CNAME = "imperator-clawdius.github.io";
const GITHUB_PAGES_IP = "185.199.108.153";
const DOMAIN = "traceready.online";
const WWW_DOMAIN = `www.${DOMAIN}`;
const STRIPE_LINK = "https://buy.stripe.com/8x27sN6NW3qzb4d6df93y01";
const PILOT_STRIPE_LINK = "https://buy.stripe.com/dRm6oH9SH8l671l59W8IU03";
const STRICT_DNS = process.argv.includes("--strict-dns");

const requiredPages = [
  {
    label: "APP_ROOT",
    path: "/",
    content: [
      "TraceReady",
      "Sample CSV",
      "Sample KML",
      "Sample GeoJSON",
      "/checkout/cleanup/",
      "/checkout/pilot/",
      "/methodology/",
      "/proof/",
      "/order-intake/",
      "/contact/",
      "Buy 5-file pilot - $745",
      "Send paid-cleanup file",
    ],
  },
  {
    label: "PRIVACY_PAGE",
    path: "/privacy/",
    content: ["Privacy", "browser", "paid cleanup", "Stripe"],
  },
  {
    label: "TERMS_PAGE",
    path: "/terms/",
    content: ["Terms", "No legal certification", "Paid cleanup", "Buy cleanup - $149", "Buy 5-file pilot - $745"],
  },
  {
    label: "CLEANUP_CHECKOUT_PAGE",
    path: "/checkout/cleanup/",
    content: [
      "TraceReady 24-hour cleanup",
      "Continue to Stripe checkout",
      "Passive Print Labs LLC",
      STRIPE_LINK,
      "Download representative sample pack",
      "Review order intake checklist",
    ],
  },
  {
    label: "PILOT_CHECKOUT_PAGE",
    path: "/checkout/pilot/",
    content: [
      "TraceReady 5-file pilot",
      "Continue to Stripe checkout",
      "Passive Print Labs LLC",
      PILOT_STRIPE_LINK,
      "Receive a batch cleanup summary and cleaned packs",
      "Review order intake checklist",
    ],
  },
  {
    label: "METHODOLOGY_PAGE",
    path: "/methodology/",
    content: ["Deterministic checks", "What TraceReady never invents", "No model training"],
  },
  {
    label: "PROOF_PAGE",
    path: "/proof/",
    content: [
      "Representative sample fixture",
      "not customer proof",
      "not transaction proof",
      "Public dataset mini-audit",
      "57,658 public cocoa rows checked",
      "46,134 point-only plots over 4 hectares",
      "Colombian-Cocoa-Dataset",
      "CBI EUDR coffee guidance",
    ],
  },
  {
    label: "ORDER_INTAKE_PAGE",
    path: "/order-intake/",
    content: ["Order intake checklist", "Stripe receipt email", "buyer requirements"],
  },
  {
    label: "CONTACT_PAGE",
    path: "/contact/",
    content: ["founder@traceready.online", "file-scope questions", "privacy or deletion requests"],
  },
  {
    label: "CHECKOUT_SUCCESS_PAGE",
    path: "/checkout/success/",
    content: [
      "Checkout received",
      "Send your cleanup files",
      "Review order intake checklist",
      "Passive Print Labs LLC",
    ],
  },
];

async function main() {
  const [apexRecords, wwwCname, artifactResults, liveResults, stripeLink, pilotStripeLink, wwwHttps] = await Promise.all([
    resolveA(DOMAIN),
    resolveCnameRecord(WWW_DOMAIN),
    Promise.all(requiredPages.map((page) => fetchGitHubPagesArtifact(page))),
    Promise.all(requiredPages.map((page) => fetchLiveHttpsPage(page))),
    head(STRIPE_LINK),
    head(PILOT_STRIPE_LINK),
    head(`https://${WWW_DOMAIN}/`),
  ]);

  const apexReady = EXPECTED_APEX_A.every((ip) => apexRecords.includes(ip));
  const wwwReady = wwwCname.includes(EXPECTED_WWW_CNAME);
  const dnsReady = apexReady && wwwReady;
  const liveHttpsRequired = dnsReady || STRICT_DNS;
  const artifactChecks = artifactResults.map((result) => {
    const contentReady = result.status === 200 && result.content.every((text) => result.body.includes(text));
    const redirectReady = liveHttpsRequired && isExpectedHttpsRedirect(result, result.path);

    return {
      ...result,
      ready: contentReady || redirectReady,
      missing: contentReady || redirectReady ? [] : result.content.filter((text) => !result.body.includes(text)),
    };
  });
  const liveChecks = liveResults.map((result) => ({
    ...result,
    ready: result.status === 200 && result.content.every((text) => result.body.includes(text)),
    missing: result.content.filter((text) => !result.body.includes(text)),
  }));
  const artifactReady = artifactChecks.every((check) => check.ready);
  const liveHttpsReady = liveChecks.every((check) => check.ready);
  const stripeReady = stripeLink.status >= 200 && stripeLink.status < 400;
  const pilotStripeReady = pilotStripeLink.status >= 200 && pilotStripeLink.status < 400;
  const wwwHttpsReady =
    wwwHttps.status >= 300 &&
    wwwHttps.status < 400 &&
    typeof wwwHttps.location === "string" &&
    wwwHttps.location.startsWith(`https://${DOMAIN}/`);

  for (const check of artifactChecks) {
    const detail = [
      `status=${check.status}`,
      `path=${check.path}`,
      `host=${DOMAIN}`,
      `via=${GITHUB_PAGES_IP}`,
      check.location ? `location=${check.location}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    printStatus(check.label, check.ready, detail);
  }

  for (const check of liveChecks) {
    const detail = [
      `status=${check.status}`,
      `url=https://${DOMAIN}${check.path}`,
      check.error ? `error=${check.error}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    printStatus(`HTTPS_${check.label}`, check.ready, detail);
  }

  printStatus("STRIPE_LINK", stripeReady, `status=${stripeLink.status} url=${STRIPE_LINK}`);
  printStatus("PILOT_STRIPE_LINK", pilotStripeReady, `status=${pilotStripeLink.status} url=${PILOT_STRIPE_LINK}`);
  printStatus("HTTPS_WWW_REDIRECT", wwwHttpsReady, `status=${wwwHttps.status} location=${wwwHttps.location || "none"}`);
  printStatus("DNS_APEX", apexReady, `current=${apexRecords.join(",") || "none"}`);
  printStatus("DNS_WWW", wwwReady, `current=${wwwCname.join(",") || "none"}`);
  console.log(`CLAIMED_DOMAIN_READY=${dnsReady}`);
  console.log(`LIVE_HTTPS_REQUIRED=${liveHttpsRequired}`);

  for (const check of [...artifactChecks, ...liveChecks]) {
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

  if (
    !artifactReady ||
    !stripeReady ||
    !pilotStripeReady ||
    (STRICT_DNS && !dnsReady) ||
    (liveHttpsRequired && (!liveHttpsReady || !wwwHttpsReady))
  ) {
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
          resolve({ ...page, status: response.statusCode ?? 0, body, location: response.headers.location || "" });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ ...page, status: 0, body: "", location: "" });
    });
    request.on("error", () => {
      resolve({ ...page, status: 0, body: "", location: "" });
    });
    request.end();
  });
}

function isExpectedHttpsRedirect(result, path) {
  return (
    result.status >= 300 &&
    result.status < 400 &&
    typeof result.location === "string" &&
    result.location === `https://${DOMAIN}${path}`
  );
}

async function fetchLiveHttpsPage(page) {
  return new Promise((resolve) => {
    const request = https.request(
      {
        hostname: DOMAIN,
        path: page.path,
        method: "GET",
        timeout: 15000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ ...page, status: response.statusCode ?? 0, body, error: "" });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ ...page, status: 0, body: "", error: "timeout" });
    });
    request.on("error", (error) => {
      resolve({ ...page, status: 0, body: "", error: error.code || error.message });
    });
    request.end();
  });
}

async function head(url) {
  return new Promise((resolve) => {
    const request = https.request(url, { method: "HEAD", timeout: 15000 }, (response) => {
      resolve({ status: response.statusCode ?? 0, location: response.headers.location || "" });
    });

    request.on("timeout", () => {
      request.destroy();
      resolve({ status: 0, location: "" });
    });
    request.on("error", () => {
      resolve({ status: 0, location: "" });
    });
    request.end();
  });
}

function printStatus(label, ok, detail) {
  console.log(`${label}=${ok ? "pass" : "pending"} ${detail}`);
}

await main();
