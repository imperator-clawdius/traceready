import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTACT_EMAIL, evaluateReplyCaptureEvidence } from "./verify-outreach-email.mjs";

const DEFAULT_OUTPUT_PATH = "private/reply-capture-evidence.json";

export function parseReplyCaptureEvidenceArgs(argv) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    contactEmail: DEFAULT_CONTACT_EMAIL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (flag === "--confirm-controlled-inbox") {
      options.confirmedControlledInbox = true;
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--output") {
      options.outputPath = value;
    } else if (flag === "--contact") {
      options.contactEmail = value;
    } else if (flag === "--received-at") {
      options.receivedAt = value;
    } else if (flag === "--received-subject") {
      options.receivedSubject = value;
    } else if (flag === "--from-eml") {
      options.emlPath = value;
    } else if (flag === "--challenge") {
      options.challengePath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export function buildReplyCaptureEvidence({
  contactEmail = DEFAULT_CONTACT_EMAIL,
  receivedAt = new Date().toISOString(),
  receivedSubject,
  confirmedControlledInbox = false,
  challenge,
} = {}) {
  if (!confirmedControlledInbox) {
    throw new Error("controlled inbox confirmation is required");
  }

  if (challenge && normalizeEmail(challenge.contactEmail) !== normalizeEmail(contactEmail)) {
    throw new Error(`challenge contactEmail must match ${contactEmail}`);
  }

  if (challenge && receivedSubject && String(receivedSubject).trim() !== String(challenge.subject ?? "").trim()) {
    throw new Error("received subject must match challenge subject");
  }

  const evidence = {
    contactEmail,
    receivedInControlledInbox: true,
    receivedAt,
    ...(challenge
      ? {
          challengeToken: challenge.challengeToken,
          challengeCreatedAt: challenge.createdAt,
          challengeSubject: challenge.subject,
        }
      : {}),
  };
  const evaluation = evaluateReplyCaptureEvidence(evidence, { contactEmail });

  if (!evaluation.ready) {
    throw new Error(evaluation.detail);
  }

  return evidence;
}

export function buildReplyCaptureEvidenceFromEml({
  contactEmail = DEFAULT_CONTACT_EMAIL,
  eml,
  confirmedControlledInbox = false,
  challenge,
} = {}) {
  const headers = parseEmlHeaders(eml);
  const body = parseEmlBody(eml);
  const receivedSubject = headers.subject;
  const receivedAt = parseEmlDate(headers.date);

  if (challenge?.challengeToken && !body.includes(challenge.challengeToken)) {
    throw new Error("received eml body must include challengeToken");
  }

  return buildReplyCaptureEvidence({
    contactEmail,
    receivedAt,
    receivedSubject,
    confirmedControlledInbox,
    challenge,
  });
}

export async function recordReplyCaptureEvidence(options = {}) {
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  const challenge = options.challengePath ? await loadReplyCaptureChallenge(options.challengePath) : options.challenge;
  const eml = options.emlPath ? await fs.readFile(options.emlPath, "utf8") : options.eml;
  const evidence = eml ? buildReplyCaptureEvidenceFromEml({ ...options, eml, challenge }) : buildReplyCaptureEvidence({ ...options, challenge });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  return {
    outputPath,
    evidence,
  };
}

export async function loadReplyCaptureChallenge(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function parseEmlHeaders(eml) {
  const headerText = String(eml ?? "").split(/\r?\n\r?\n/, 1)[0] ?? "";
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, " ");
  const headers = {};

  for (const line of unfolded.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in headers)) {
      headers[key] = value;
    }
  }

  return headers;
}

function parseEmlBody(eml) {
  const parts = String(eml ?? "").split(/\r?\n\r?\n/);
  return parts.slice(1).join("\n\n");
}

function parseEmlDate(value) {
  if (!value) {
    return "";
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}

async function main() {
  const options = parseReplyCaptureEvidenceArgs(process.argv.slice(2));
  const result = await recordReplyCaptureEvidence(options);

  console.log(
    [
      "REPLY_CAPTURE_EVIDENCE=pass",
      `contact=${result.evidence.contactEmail}`,
      `received_at=${result.evidence.receivedAt}`,
      `output=${result.outputPath}`,
    ].join(" "),
  );
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`REPLY_CAPTURE_EVIDENCE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
