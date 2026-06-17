import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_EVIDENCE_PATH = "private/reply-capture-evidence.json";
const DEFAULT_CHALLENGE_PATH = "private/reply-capture-challenge.json";
const DEFAULT_HANDOFF_PATH = "private/reply-capture-handoff.md";
const DEFAULT_PREFLIGHT_OUTPUT_DIR = "private";
const DEFAULT_PREFLIGHT_QUEUE_PATH = "private/preflight-submit-queue.md";
const CONTACT_EMAIL = "founder@traceready.online";

export function parseReplyCaptureGateArgs(argv) {
  const parsed = {
    today: todayIsoDate(),
    evidencePath: DEFAULT_EVIDENCE_PATH,
    challengePath: DEFAULT_CHALLENGE_PATH,
    handoffPath: DEFAULT_HANDOFF_PATH,
    preflightOutputDir: DEFAULT_PREFLIGHT_OUTPUT_DIR,
    preflightQueuePath: DEFAULT_PREFLIGHT_QUEUE_PATH,
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

    if (flag === "--today") {
      parsed.today = value;
    } else if (flag === "--evidence") {
      parsed.evidencePath = value;
    } else if (flag === "--challenge") {
      parsed.challengePath = value;
    } else if (flag === "--handoff") {
      parsed.handoffPath = value;
    } else if (flag === "--scorecard-output") {
      parsed.scorecardPath = value;
    } else if (flag === "--preflight-output-dir") {
      parsed.preflightOutputDir = value;
    } else if (flag === "--preflight-queue-output") {
      parsed.preflightQueuePath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  parsed.scorecardPath ??= `private/traction-readiness-scorecard-${parsed.today}.md`;
  return parsed;
}

export async function finalizeReplyCaptureGate(options = {}, dependencies = {}) {
  const today = options.today ?? todayIsoDate();
  const evidencePath = options.evidencePath ?? DEFAULT_EVIDENCE_PATH;
  const challengePath = options.challengePath ?? DEFAULT_CHALLENGE_PATH;
  const handoffPath = options.handoffPath ?? DEFAULT_HANDOFF_PATH;
  const scorecardPath = options.scorecardPath ?? `private/traction-readiness-scorecard-${today}.md`;
  const preflightOutputDir = options.preflightOutputDir ?? DEFAULT_PREFLIGHT_OUTPUT_DIR;
  const preflightQueuePath = options.preflightQueuePath ?? DEFAULT_PREFLIGHT_QUEUE_PATH;
  const exists = dependencies.exists ?? pathExists;
  const inspectEmail = dependencies.inspectEmail ?? inspectOutreachEmailDns;
  const runNodeScript = dependencies.runNodeScript ?? runNodeScriptDefault;
  const loadChallenge = dependencies.loadChallenge ?? loadReplyCaptureChallenge;
  const replyCaptureChallenge = await loadChallengeIfPresent(challengePath, { exists, loadChallenge });

  if (!(await exists(evidencePath))) {
    return {
      ready: false,
      reason: "missing_reply_capture_evidence",
      evidencePath,
      challengePath,
      handoffPath,
      replyCaptureChallenge,
    };
  }

  const emailReport = await inspectEmail({
    replyCaptureEvidencePath: evidencePath,
    replyCaptureChallengePath: challengePath,
  });
  const replyCaptureReady = replyCaptureReadyFromEmailReport(emailReport);

  if (!replyCaptureReady) {
    return {
      ready: false,
      reason: "reply_capture_not_ready",
      evidencePath,
      challengePath,
      handoffPath,
      replyCaptureReady,
      emailReady: Boolean(emailReport.ready),
    };
  }

  const scorecardArgs = [
    "--reply-capture-evidence",
    evidencePath,
    "--reply-capture-challenge",
    challengePath,
    "--output",
    scorecardPath,
    "--today",
    today,
  ];
  const preflightArgs = [
    "--all-ready",
    "--reply-capture-evidence",
    evidencePath,
    "--reply-capture-challenge",
    challengePath,
    "--output-dir",
    preflightOutputDir,
    "--queue-output",
    preflightQueuePath,
    "--today",
    today,
  ];
  const scorecardRun = await runNodeScript("scripts/score-traction-readiness.mjs", scorecardArgs);
  const preflightRun = await runNodeScript("scripts/preflight-outreach-submit.mjs", preflightArgs);

  return {
    ready: true,
    reason: "reply_capture_ready",
    evidencePath,
    challengePath,
    handoffPath,
    scorecardPath,
    preflightQueuePath,
    replyCaptureReady,
    emailReady: Boolean(emailReport.ready),
    scorecardRun,
    preflightRun,
  };
}

export function renderReplyCaptureGateReport(result) {
  if (!result.ready) {
    const lines = [
      `REPLY_CAPTURE_GATE=pending reason=${result.reason}`,
      `REPLY_CAPTURE_GATE_EVIDENCE=${result.evidencePath}`,
      `REPLY_CAPTURE_GATE_CHALLENGE=${result.challengePath}`,
    ];

    if (result.reason === "missing_reply_capture_evidence") {
      lines.push(`REPLY_CAPTURE_GATE_NEXT=send the email in ${result.handoffPath}`);
      lines.push(
        `REPLY_CAPTURE_GATE_RECORD=\`${recordReplyCaptureCommand({
          evidencePath: result.evidencePath,
          contactEmail: CONTACT_EMAIL,
          receivedSubject: result.replyCaptureChallenge?.subject,
          challengePath: result.challengePath,
        })}\``,
      );
    }

    return `${lines.join("\n")}\n`;
  }

  return `${[
    `REPLY_CAPTURE_GATE=pass reply_capture_ready=${result.replyCaptureReady} email_ready=${result.emailReady}`,
    `REPLY_CAPTURE_GATE_SCORECARD=scorecard=${result.scorecardPath}`,
    `REPLY_CAPTURE_GATE_PREFLIGHT=preflight_queue=${result.preflightQueuePath}`,
  ].join("\n")}\n`;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadReplyCaptureChallenge(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadChallengeIfPresent(challengePath, { exists, loadChallenge }) {
  try {
    if (!(await exists(challengePath))) {
      return null;
    }

    return await loadChallenge(challengePath);
  } catch {
    return null;
  }
}

async function runNodeScriptDefault(scriptPath, args) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
    windowsHide: true,
  });

  return { stdout, stderr };
}

function replyCaptureReadyFromEmailReport(emailReport = {}) {
  if (emailReport.replyCaptureReady) {
    return true;
  }

  const checks = Object.fromEntries((emailReport.checks ?? []).map((check) => [check.label, check.ready]));
  return Boolean(checks.OUTREACH_EMAIL_MX && checks.OUTREACH_EMAIL_ALIAS_TEST);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function quoteForCommand(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function recordReplyCaptureCommand({ evidencePath, contactEmail, receivedSubject, challengePath }) {
  const subjectArg = receivedSubject ? quoteForCommand(receivedSubject) : "<received-subject>";

  return `npm run record:reply-capture -- --output ${evidencePath} --contact ${contactEmail} --received-at <received-at-iso> --received-subject ${subjectArg} --challenge ${challengePath} --confirm-controlled-inbox`;
}

async function main() {
  const options = parseReplyCaptureGateArgs(process.argv.slice(2));
  const result = await finalizeReplyCaptureGate(options);
  process.stdout.write(renderReplyCaptureGateReport(result));

  if (!result.ready) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`REPLY_CAPTURE_GATE=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
