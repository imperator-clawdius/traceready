import fs from "node:fs/promises";
import { resolveMx, resolveTxt } from "node:dns/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_DOMAIN = "traceready.online";
export const DEFAULT_CONTACT_EMAIL = `founder@${DEFAULT_DOMAIN}`;
export const EXPECTED_FORWARDING_MX = [
  "eforward1.registrar-servers.com",
  "eforward2.registrar-servers.com",
  "eforward3.registrar-servers.com",
  "eforward4.registrar-servers.com",
  "eforward5.registrar-servers.com",
];
export const NAMECHEAP_FORWARDING_SPF = "include:spf.efwd.registrar-servers.com";
export const DEFAULT_DKIM_SELECTORS = ["default", "google", "selector1", "selector2"];

export function parseOutreachEmailArgs(argv) {
  const options = {
    domain: DEFAULT_DOMAIN,
    contactEmail: DEFAULT_CONTACT_EMAIL,
    dkimSelectors: [...DEFAULT_DKIM_SELECTORS],
    aliasTested: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--domain" && next) {
      options.domain = next;
      index += 1;
    } else if (arg === "--contact" && next) {
      options.contactEmail = next;
      index += 1;
    } else if (arg === "--dkim-selector" && next) {
      options.dkimSelectors.push(next);
      index += 1;
    } else if (arg === "--reply-capture-evidence" && next) {
      options.replyCaptureEvidencePath = next;
      index += 1;
    } else if (arg === "--reply-capture-challenge" && next) {
      options.replyCaptureChallengePath = next;
      index += 1;
    } else if (arg === "--alias-tested") {
      options.aliasTested = true;
    }
  }

  return options;
}

export async function inspectOutreachEmailDns(options = {}) {
  const domain = options.domain ?? DEFAULT_DOMAIN;
  const contactEmail = options.contactEmail ?? `founder@${domain}`;
  const dkimSelectors = options.dkimSelectors ?? DEFAULT_DKIM_SELECTORS;
  const resolver = options.resolver ?? defaultResolver;
  const replyCaptureEvidence = options.replyCaptureEvidencePath
    ? await loadReplyCaptureEvidence(options.replyCaptureEvidencePath)
    : options.replyCaptureEvidence;
  const replyCaptureChallenge = options.replyCaptureChallengePath
    ? await loadReplyCaptureChallenge(options.replyCaptureChallengePath)
    : options.replyCaptureChallenge;
  const replyCaptureEvidenceResult = replyCaptureEvidence
    ? evaluateReplyCaptureEvidence(replyCaptureEvidence, { contactEmail, expectedChallenge: replyCaptureChallenge })
    : null;
  const aliasTested = Boolean(options.aliasTested || replyCaptureEvidenceResult?.ready);

  const [mxRecords, apexTxtRecords, dmarcTxtRecords, ...dkimTxtRecordSets] = await Promise.all([
    resolver.mx(domain),
    resolver.txt(domain),
    resolver.txt(`_dmarc.${domain}`),
    ...dkimSelectors.map((selector) => resolver.txt(`${selector}._domainkey.${domain}`)),
  ]);

  return evaluateOutreachEmailDns({
    domain,
    contactEmail,
    dkimSelectors,
    aliasTested,
    mxRecords,
    apexTxtRecords,
    dmarcTxtRecords,
    dkimTxtRecordSets,
    replyCaptureEvidenceResult,
  });
}

export async function loadReplyCaptureEvidence(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function loadReplyCaptureChallenge(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export function evaluateReplyCaptureEvidence(
  evidence,
  { contactEmail = DEFAULT_CONTACT_EMAIL, expectedChallenge = null } = {},
) {
  const errors = [];
  const receivedAt = evidence?.receivedAt ?? evidence?.testReceivedAt;

  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    errors.push("evidence must be a JSON object");
  }

  if (normalizeEmail(evidence?.contactEmail) !== normalizeEmail(contactEmail)) {
    errors.push(`contactEmail must be ${contactEmail}`);
  }

  if (evidence?.receivedInControlledInbox !== true) {
    errors.push("receivedInControlledInbox must be true");
  }

  if (!receivedAt || Number.isNaN(Date.parse(receivedAt))) {
    errors.push("receivedAt must be a valid ISO timestamp");
  }

  const hasChallengeMetadata =
    "challengeToken" in evidence || "challengeCreatedAt" in evidence || "challengeSubject" in evidence;
  const challengeToken = String(evidence?.challengeToken ?? "").trim();
  const challengeSubject = String(evidence?.challengeSubject ?? "").trim();

  if (hasChallengeMetadata && !challengeToken) {
    errors.push("challengeToken must be a non-empty string when challenge metadata is present");
  }

  if (hasChallengeMetadata && (!evidence.challengeCreatedAt || Number.isNaN(Date.parse(evidence.challengeCreatedAt)))) {
    errors.push("challengeCreatedAt must be a valid ISO timestamp when challenge metadata is present");
  }

  if (hasChallengeMetadata && !challengeSubject) {
    errors.push("challengeSubject must be a non-empty string when challenge metadata is present");
  }

  if (challengeToken && challengeSubject && !challengeSubject.includes(challengeToken)) {
    errors.push("challengeSubject must include challengeToken");
  }

  if (expectedChallenge) {
    if (normalizeEmail(expectedChallenge.contactEmail) !== normalizeEmail(contactEmail)) {
      errors.push(`reply-capture challenge contactEmail must be ${contactEmail}`);
    }

    if (challengeToken !== String(expectedChallenge.challengeToken ?? "").trim()) {
      errors.push("challengeToken must match reply-capture challenge");
    }

    if (evidence?.challengeCreatedAt !== expectedChallenge.createdAt) {
      errors.push("challengeCreatedAt must match reply-capture challenge");
    }

    if (challengeSubject !== String(expectedChallenge.subject ?? "").trim()) {
      errors.push("challengeSubject must match reply-capture challenge");
    }
  }

  if (
    receivedAt &&
    evidence?.challengeCreatedAt &&
    !Number.isNaN(Date.parse(receivedAt)) &&
    !Number.isNaN(Date.parse(evidence.challengeCreatedAt)) &&
    Date.parse(receivedAt) < Date.parse(evidence.challengeCreatedAt)
  ) {
    errors.push("receivedAt must be after challengeCreatedAt");
  }

  return {
    ready: errors.length === 0,
    receivedAt,
    detail:
      errors.length === 0
        ? `evidence receivedAt=${receivedAt}${evidence?.challengeToken ? ` challenge=${evidence.challengeToken}` : ""}`
        : `invalid evidence: ${errors.join("; ")}`,
    errors,
  };
}

export function evaluateOutreachEmailDns({
  domain = DEFAULT_DOMAIN,
  contactEmail = DEFAULT_CONTACT_EMAIL,
  dkimSelectors = DEFAULT_DKIM_SELECTORS,
  aliasTested = false,
  mxRecords = [],
  apexTxtRecords = [],
  dmarcTxtRecords = [],
  dkimTxtRecordSets = [],
  replyCaptureEvidenceResult = null,
}) {
  const normalizedMxHosts = mxRecords.map((record) => normalizeHost(record.exchange ?? record.host ?? String(record)));
  const apexTxt = flattenTxt(apexTxtRecords);
  const dmarcTxt = flattenTxt(dmarcTxtRecords);
  const dkimRecords = dkimSelectors.map((selector, index) => ({
    selector,
    txt: flattenTxt(dkimTxtRecordSets[index] ?? []),
  }));
  const expectedMxMissing = EXPECTED_FORWARDING_MX.filter((host) => !normalizedMxHosts.includes(host));
  const spfRecords = apexTxt.filter((value) => value.toLowerCase().startsWith("v=spf1"));
  const dmarcRecords = dmarcTxt.filter((value) => value.toLowerCase().startsWith("v=dmarc1"));
  const dkimReadySelectors = dkimRecords
    .filter((record) => record.txt.some((value) => value.toLowerCase().startsWith("v=dkim1")))
    .map((record) => record.selector);

  const mxReady = expectedMxMissing.length === 0;
  const spfReady = spfRecords.some((record) => record.includes(NAMECHEAP_FORWARDING_SPF));
  const dmarcReady = dmarcRecords.length > 0;
  const dkimReady = dkimReadySelectors.length > 0;
  const outboundReady = spfReady && dmarcReady && dkimReady;
  const dnsReady = mxReady && spfReady && outboundReady;
  const replyCaptureReady = mxReady && aliasTested;
  const ready = dnsReady && aliasTested;

  return {
    domain,
    contactEmail,
    dnsReady,
    replyCaptureReady,
    checks: [
      {
        label: "OUTREACH_EMAIL_MX",
        ready: mxReady,
        detail:
          expectedMxMissing.length === 0
            ? `found=${normalizedMxHosts.join(",") || "none"}`
            : `missing=${expectedMxMissing.join(",")} found=${normalizedMxHosts.join(",") || "none"}`,
      },
      {
        label: "OUTREACH_EMAIL_SPF",
        ready: spfReady,
        detail: `records=${spfRecords.join(" | ") || "none"}`,
      },
      {
        label: "OUTREACH_EMAIL_DMARC",
        ready: dmarcReady,
        detail: `records=${dmarcRecords.join(" | ") || "none"}`,
      },
      {
        label: "OUTREACH_EMAIL_DKIM",
        ready: dkimReady,
        detail: `selectors=${dkimReadySelectors.join(",") || "none"}`,
      },
      {
        label: "OUTREACH_EMAIL_OUTBOUND_AUTH",
        ready: outboundReady,
        detail: "requires SPF plus at least one DKIM selector and DMARC",
      },
      {
        label: "OUTREACH_EMAIL_ALIAS_TEST",
        ready: aliasTested,
        detail: aliasTested
          ? (replyCaptureEvidenceResult?.detail ?? `manual send/receive test acknowledged for ${contactEmail}`)
          : (replyCaptureEvidenceResult?.detail ??
            `DNS cannot prove ${contactEmail} forwards to a controlled mailbox; send and receive a test email, then rerun with --reply-capture-evidence and --reply-capture-challenge`),
      },
      {
        label: "OUTREACH_EMAIL_REPLY_CAPTURE",
        ready: replyCaptureReady,
        detail: replyCaptureReady
          ? "forwarding MX and manual alias delivery test are both present"
          : "requires forwarding MX plus a manual alias delivery test",
      },
    ],
    ready,
  };
}

export function renderOutreachEmailReport(report) {
  const lines = [
    `OUTREACH_EMAIL_DOMAIN=${report.domain}`,
    `OUTREACH_EMAIL_CONTACT=${report.contactEmail}`,
    ...report.checks.map((check) => `${check.label}=${check.ready ? "pass" : "pending"} ${check.detail}`),
    `OUTREACH_EMAIL_DNS_READY=${report.dnsReady}`,
    `OUTREACH_EMAIL_READY=${report.ready}`,
  ];

  if (!report.ready) {
    lines.push(
      `OUTREACH_EMAIL_NEXT=${report.replyCaptureReady ? "configure authenticated outbound sender, publish DKIM and DMARC" : "verify alias delivery, configure authenticated outbound sender, publish DKIM and DMARC"}`,
    );
    lines.push("OUTREACH_EMAIL_DMARC_STARTER=TXT _dmarc v=DMARC1; p=none; rua=mailto:founder@traceready.online; adkim=r; aspf=r");
    lines.push("OUTREACH_EMAIL_DKIM_NEXT=add the DKIM TXT/CNAME records from the outbound mail provider");
    if (!report.replyCaptureReady) {
      lines.push(
        "OUTREACH_EMAIL_ALIAS_NEXT=create Namecheap Redirect Email alias founder -> controlled inbox; run `npm run prepare:reply-capture -- --output private/reply-capture-challenge.json --contact founder@traceready.online`; send the generated subject to founder@traceready.online; record private reply-capture evidence with `npm run record:reply-capture -- --output private/reply-capture-evidence.json --contact founder@traceready.online --received-at <received-at-iso> --challenge private/reply-capture-challenge.json --confirm-controlled-inbox`; then rerun with --reply-capture-evidence and --reply-capture-challenge",
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseOutreachEmailArgs(process.argv.slice(2));
  const report = await inspectOutreachEmailDns(options);

  process.stdout.write(renderOutreachEmailReport(report));

  if (!report.ready) {
    process.exitCode = 1;
  }
}

const defaultResolver = {
  async mx(hostname) {
    try {
      return await resolveMx(hostname);
    } catch {
      return [];
    }
  },
  async txt(hostname) {
    try {
      return await resolveTxt(hostname);
    } catch {
      return [];
    }
  },
};

function flattenTxt(records) {
  return records.map((record) => (Array.isArray(record) ? record.join("") : String(record))).filter(Boolean);
}

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
