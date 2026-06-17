import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTACT_EMAIL } from "./verify-outreach-email.mjs";

const DEFAULT_OUTPUT_PATH = "private/reply-capture-challenge.json";

export function parseReplyCaptureChallengeArgs(argv) {
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

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--output") {
      options.outputPath = value;
    } else if (flag === "--contact") {
      options.contactEmail = value;
    } else if (flag === "--created-at") {
      options.createdAt = value;
    } else if (flag === "--token") {
      options.token = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export function buildReplyCaptureChallenge({
  contactEmail = DEFAULT_CONTACT_EMAIL,
  createdAt = new Date().toISOString(),
  token = generateChallengeToken(),
} = {}) {
  if (!contactEmail || !String(contactEmail).includes("@")) {
    throw new Error("contactEmail must be an email address");
  }

  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("createdAt must be a valid ISO timestamp");
  }

  if (!token || typeof token !== "string") {
    throw new Error("token is required");
  }

  return {
    contactEmail,
    createdAt,
    challengeToken: token,
    subject: `TraceReady reply-capture test ${token}`,
    body: [
      `TraceReady reply-capture test for ${contactEmail}.`,
      `Challenge token: ${token}`,
      "If this arrives in the controlled inbox, record private evidence with the received timestamp and this token.",
    ].join("\n"),
  };
}

export async function prepareReplyCaptureChallenge(options = {}) {
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  const challenge = buildReplyCaptureChallenge(options);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(challenge, null, 2)}\n`, "utf8");

  return {
    outputPath,
    challenge,
  };
}

async function main() {
  const options = parseReplyCaptureChallengeArgs(process.argv.slice(2));
  const result = await prepareReplyCaptureChallenge(options);

  console.log(
    [
      "REPLY_CAPTURE_CHALLENGE=pass",
      `contact=${result.challenge.contactEmail}`,
      `token=${result.challenge.challengeToken}`,
      `output=${result.outputPath}`,
    ].join(" "),
  );
  console.log(`REPLY_CAPTURE_CHALLENGE_SUBJECT=${quoteForLog(result.challenge.subject)}`);
}

function generateChallengeToken() {
  return `trc-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(4).toString("hex")}`;
}

function quoteForLog(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`REPLY_CAPTURE_CHALLENGE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
