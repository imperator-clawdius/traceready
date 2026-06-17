import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTACT_EMAIL } from "./verify-outreach-email.mjs";

const DEFAULT_CHALLENGE_PATH = "private/reply-capture-challenge.json";
const DEFAULT_EVIDENCE_PATH = "private/reply-capture-evidence.json";

export function parseReplyCaptureChallengeVerificationArgs(argv) {
  const options = {
    challengePath: DEFAULT_CHALLENGE_PATH,
    evidencePath: DEFAULT_EVIDENCE_PATH,
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

    if (flag === "--challenge") {
      options.challengePath = value;
    } else if (flag === "--evidence-output") {
      options.evidencePath = value;
    } else if (flag === "--contact") {
      options.contactEmail = value;
    } else if (flag === "--handoff-output") {
      options.handoffPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export async function verifyReplyCaptureChallengeFile(options = {}) {
  const challengePath = options.challengePath ?? DEFAULT_CHALLENGE_PATH;
  const raw = await fs.readFile(challengePath, "utf8");
  const challenge = JSON.parse(raw);

  return evaluateReplyCaptureChallenge(challenge, {
    contactEmail: options.contactEmail ?? DEFAULT_CONTACT_EMAIL,
  });
}

export function evaluateReplyCaptureChallenge(challenge, { contactEmail = DEFAULT_CONTACT_EMAIL } = {}) {
  const errors = [];

  if (!challenge || typeof challenge !== "object" || Array.isArray(challenge)) {
    return {
      ready: false,
      challenge: {},
      errors: ["challenge must be a JSON object"],
    };
  }

  const expectedContact = normalizeEmail(contactEmail);
  const actualContact = normalizeEmail(challenge.contactEmail);
  const createdAt = challenge.createdAt;
  const challengeToken = String(challenge.challengeToken ?? "").trim();
  const subject = String(challenge.subject ?? "").trim();
  const body = String(challenge.body ?? "").trim();

  if (actualContact !== expectedContact) {
    errors.push(`contactEmail must be ${contactEmail}`);
  }

  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    errors.push("createdAt must be a valid ISO timestamp");
  }

  if (!challengeToken) {
    errors.push("challengeToken must be a non-empty string");
  }

  if (!subject) {
    errors.push("subject must be a non-empty string");
  } else if (challengeToken && !subject.includes(challengeToken)) {
    errors.push("subject must include challengeToken");
  }

  if (!body) {
    errors.push("body must be a non-empty string");
  } else {
    if (challengeToken && !body.includes(challengeToken)) {
      errors.push("body must include challengeToken");
    }
    if (actualContact && !body.toLowerCase().includes(actualContact)) {
      errors.push("body must include contactEmail");
    }
  }

  return {
    ready: errors.length === 0,
    challenge,
    errors,
  };
}

export function renderReplyCaptureChallengeReport(result, options = {}) {
  const challengePath = options.challengePath ?? DEFAULT_CHALLENGE_PATH;
  const evidencePath = options.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const challenge = result.challenge ?? {};
  const lines = [
    [
      `REPLY_CAPTURE_CHALLENGE=${result.ready ? "pass" : "pending"}`,
      `contact=${challenge.contactEmail ?? "unknown"}`,
      `token=${challenge.challengeToken ?? "unknown"}`,
      `path=${challengePath}`,
    ].join(" "),
  ];

  if (!result.ready) {
    lines.push(`REPLY_CAPTURE_CHALLENGE_ERRORS=${result.errors.join("; ")}`);
    return `${lines.join("\n")}\n`;
  }

  lines.push(`REPLY_CAPTURE_CHALLENGE_SUBJECT=${quoteForLog(challenge.subject)}`);
  lines.push("REPLY_CAPTURE_CHALLENGE_BODY_START");
  lines.push(challenge.body);
  lines.push("REPLY_CAPTURE_CHALLENGE_BODY_END");
  lines.push(
    `REPLY_CAPTURE_CHALLENGE_NEXT=send the subject above to ${challenge.contactEmail} from a separate mailbox; after it arrives, run \`npm run record:reply-capture -- --output ${evidencePath} --contact ${challenge.contactEmail} --received-at <received-at-iso> --challenge ${challengePath} --confirm-controlled-inbox\``,
  );

  return `${lines.join("\n")}\n`;
}

export function renderReplyCaptureChallengeHandoff(result, options = {}) {
  const challengePath = options.challengePath ?? DEFAULT_CHALLENGE_PATH;
  const evidencePath = options.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const challenge = result.challenge ?? {};

  if (!result.ready) {
    return [
      "# TraceReady reply-capture handoff",
      "",
      "Status: challenge is not ready.",
      "",
      `Errors: ${result.errors.join("; ") || "unknown"}`,
      "",
    ].join("\n");
  }

  return [
    "# TraceReady reply-capture handoff",
    "",
    "Status: challenge verified; inbox receipt not yet proven.",
    "",
    "## Email to Send",
    "",
    `To: \`${challenge.contactEmail}\``,
    `Subject: \`${challenge.subject}\``,
    "",
    "```text",
    challenge.body,
    "```",
    "",
    "Send this from a separate mailbox, not from the forwarding destination.",
    "",
    "## After It Arrives",
    "",
    "Record the real received timestamp from the controlled inbox:",
    "",
    "```powershell",
    `npm run record:reply-capture -- --output ${evidencePath} --contact ${challenge.contactEmail} --received-at <received-at-iso> --challenge ${challengePath} --confirm-controlled-inbox`,
    "```",
    "",
    "Then rerun the email readiness check:",
    "",
    "```powershell",
    `npm run verify:outreach-email -- --reply-capture-evidence ${evidencePath} --reply-capture-challenge ${challengePath}`,
    "```",
    "",
    "Then refresh the scorecard and submit preflight queue:",
    "",
    "```powershell",
    "npm run finalize:reply-capture",
    "```",
    "",
    "Do not mark outreach sent or measure non-response until the readiness check passes reply capture.",
    "",
  ].join("\n");
}

export async function writeReplyCaptureChallengeHandoff(result, options = {}) {
  const handoffPath = options.handoffPath;

  if (!handoffPath) {
    return;
  }

  await fs.mkdir(path.dirname(handoffPath), { recursive: true });
  await fs.writeFile(handoffPath, renderReplyCaptureChallengeHandoff(result, options), "utf8");
}

async function main() {
  const options = parseReplyCaptureChallengeVerificationArgs(process.argv.slice(2));
  const result = await verifyReplyCaptureChallengeFile(options);
  await writeReplyCaptureChallengeHandoff(result, options);
  process.stdout.write(renderReplyCaptureChallengeReport(result, options));
  if (result.ready && options.handoffPath) {
    process.stdout.write(`REPLY_CAPTURE_CHALLENGE_HANDOFF=${options.handoffPath}\n`);
  }

  if (!result.ready) {
    process.exitCode = 1;
  }
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
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
