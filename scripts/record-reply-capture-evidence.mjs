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
  confirmedControlledInbox = false,
  challenge,
} = {}) {
  if (!confirmedControlledInbox) {
    throw new Error("controlled inbox confirmation is required");
  }

  if (challenge && normalizeEmail(challenge.contactEmail) !== normalizeEmail(contactEmail)) {
    throw new Error(`challenge contactEmail must match ${contactEmail}`);
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

export async function recordReplyCaptureEvidence(options = {}) {
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  const challenge = options.challengePath ? await loadReplyCaptureChallenge(options.challengePath) : options.challenge;
  const evidence = buildReplyCaptureEvidence({ ...options, challenge });

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
