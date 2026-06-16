import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { FIELD_NOTE_BASE_URL, FILE_CHECK_BASE_URL, PILOT_PROOF_BASE_URL, PROOF_BASE_URL } from "./outreach-tracking.mjs";

const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-01.csv";
const DEFAULT_OUTPUT_PATH = "docs/proof-led-outreach-send-pack-01.md";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PERSONAL_PROFILE_PATTERN =
  /(?:linkedin\.com\/in\/|facebook\.com\/people\/|instagram\.com\/p\/|x\.com\/[^/\s]+\/status\/)/i;

export function renderOutreachPacket(rows, options = {}) {
  const title = options.title ?? "TraceReady proof-led outreach send packet - batch 01";
  const batchPath = options.batchPath ?? DEFAULT_BATCH_PATH;

  return [
    `# ${title}`,
    "",
    `Generated from \`${batchPath}\`. Use company-level public routes only. Do not add employee names, personal emails, or personal-profile URLs to the committed packet.`,
    "",
    "Core proof: TraceReady checked 57,658 public cocoa rows and found 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.",
    "",
    `Base proof page: ${PROOF_BASE_URL}`,
    `Base field note: ${FIELD_NOTE_BASE_URL}`,
    `Base browser-side file check: ${FILE_CHECK_BASE_URL}`,
    `Base documented pilot request: ${PILOT_PROOF_BASE_URL}`,
    "Use the tracked links inside each route section so replies, field-note clicks, and file checks can be tied back to a route ID.",
    "",
    "Guardrail: TraceReady is operational file cleanup and readiness checking, not legal certification, not a TRACES submission service, and not deforestation-free proof.",
    "",
    ...rows.flatMap((row) => renderRow(row)),
  ].join("\n");
}

export function validateRenderedOutreachPacket(markdown, rows) {
  const errors = [];

  if (!markdown.includes("57,658")) {
    errors.push("packet must include 57,658 public-audit proof number");
  }

  if (!markdown.includes("46,134")) {
    errors.push("packet must include 46,134 public-audit proof number");
  }

  if (EMAIL_PATTERN.test(markdown)) {
    errors.push("packet contains an email address; keep committed send packet company-level");
  }

  if (PERSONAL_PROFILE_PATTERN.test(markdown)) {
    errors.push("packet contains a personal-profile URL");
  }

  for (const row of rows) {
    if (!markdown.includes(`## ${row.priority}. ${row.company_or_channel}`)) {
      errors.push(`packet must include section for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.source_url)) {
      errors.push(`packet must include source URL for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.route_id)) {
      errors.push(`packet must include route ID for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.proof_url)) {
      errors.push(`packet must include tracked proof URL for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.field_note_url)) {
      errors.push(`packet must include tracked field-note URL for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.file_check_url)) {
      errors.push(`packet must include tracked file-check URL for ${row.company_or_channel}`);
    }

    if (!markdown.includes(row.pilot_proof_url)) {
      errors.push(`packet must include tracked documented-pilot URL for ${row.company_or_channel}`);
    }
  }

  return [...new Set(errors)];
}

function renderRow(row) {
  const subject = subjectFor(row);
  const body = bodyFor(row);
  const followUp = followUpFor(row);

  return [
    `## ${row.priority}. ${row.company_or_channel}`,
    "",
    `- Route ID: ${row.route_id}`,
    `- Tier: ${row.tier}`,
    `- Segment: ${row.segment}`,
    `- Public route: ${row.public_route}`,
    `- Source: ${row.source_url}`,
    `- Proof URL: ${row.proof_url}`,
    `- Field note URL: ${row.field_note_url}`,
    `- File check URL: ${row.file_check_url}`,
    `- Documented pilot URL: ${row.pilot_proof_url}`,
    `- Ask: ${row.ask}`,
    "",
    "### First Message",
    "",
    "```text",
    `Subject: ${subject}`,
    "",
    body,
    "```",
    "",
    "### Follow-Up",
    "",
    "```text",
    "Subject: Re: EUDR file-readiness check",
    "",
    followUp,
    "```",
    "",
  ];
}

export function subjectFor(row) {
  if (row.message_variant === "association") {
    return "Free EUDR file-readiness example for coffee members";
  }

  if (row.message_variant === "overflow") {
    return "First-pass cleanup desk for EUDR supplier files";
  }

  return "Row-level check for messy EUDR farm files";
}

export function bodyFor(row) {
  if (row.message_variant === "association") {
    return [
      `Hi ${row.company_or_channel},`,
      "",
      "I built TraceReady as a narrow cleanup desk for coffee and cocoa CSV/KML/GeoJSON files before buyer review.",
      "",
      "I published a public mini-audit using a 57,658-row cocoa farm-location dataset. The useful part for members is practical: even with latitude, longitude, and area fields, the file still surfaced 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.",
      "",
      `Public proof page: ${row.proof_url}`,
      `Shareable field note: ${row.field_note_url}`,
      `Documented pilot request: ${row.pilot_proof_url}`,
      "",
      "This is not legal certification and not a TRACES submission tool. It is a free operational example of file defects that create buyer-review rework.",
      "",
      "Is there a member education channel where this would be useful?",
    ].join("\n");
  }

  if (row.message_variant === "overflow") {
    return [
      `Hi ${row.company_or_channel},`,
      "",
      "I am looking for EUDR consultants and advisors who run into broken coffee/cocoa supplier files before the real due diligence work can even start.",
      "",
      "TraceReady is deliberately narrow: CSV/KML/GeoJSON readiness checks, row-level issue logs, cleaned CSV, normalized GeoJSON, and a buyer summary. It does not certify compliance, submit to TRACES, or replace legal review.",
      "",
      `Public proof page: ${row.proof_url}`,
      `Shareable field note: ${row.field_note_url}`,
      `Documented pilot request: ${row.pilot_proof_url}`,
      "",
      "If a client sends you a malformed farm file, I can handle the first-pass cleanup so your team is not stuck fixing coordinates, missing plot IDs, duplicate farm IDs, and point-only over-4ha records by hand.",
    ].join("\n");
  }

  return [
    `Hi ${row.company_or_channel},`,
    "",
    "Quick, specific note. I ran a public cocoa farm-location dataset through TraceReady, a file-readiness checker for coffee and cocoa handoff files. Even after assuming the file was Colombian cocoa, it still had 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity.",
    "",
    "That is the narrow problem I am looking for: not \"buy software,\" just \"will this supplier CSV/KML/GeoJSON create buyer-review rework?\"",
    "",
    `Public proof page: ${row.proof_url}`,
    `Shareable field note: ${row.field_note_url}`,
    "",
    `You can run one file in the browser first, before sending me anything: ${row.file_check_url}`,
    `Documented pilot request if you want a permissioned anonymized before/after case instead of a generic demo: ${row.pilot_proof_url}`,
    "",
    "If the issue list is useful, I can turn one file into a cleaned pack and row-level issue log. Worth testing one messy supplier file?",
  ].join("\n");
}

export function followUpFor(row) {
  if (row.message_variant === "association") {
    return [
      `Quick follow-up on the TraceReady public file-readiness example for ${row.company_or_channel}.`,
      "",
      "The narrow value is showing common EUDR handoff defects before members send files into a buyer or platform workflow: missing plot IDs, missing supplier identity, and point-only plots over 4 hectares.",
      "",
      `If this is not the right route, is there a better public member-resource channel for a practical example? ${row.proof_url}`,
      "",
      `If one member wants to document a real anonymized before/after case, the issue-count-first request is here: ${row.pilot_proof_url}`,
    ].join("\n");
  }

  return [
    `Quick follow-up for ${row.company_or_channel}.`,
    "",
    "The low-friction path is just one file checked in the browser first. Coordinates do not need to leave your machine for the initial issue list.",
    "",
    `If the issue list is useful, the paid cleanup offer is one cleaned buyer pack and row-level issue log. ${row.file_check_url}`,
    "",
    `If you want the first documented pilot case instead, start with issue counts here: ${row.pilot_proof_url}`,
  ].join("\n");
}

async function main() {
  const batchPath = process.argv[2] ?? DEFAULT_BATCH_PATH;
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT_PATH;
  const csv = await fs.readFile(batchPath, "utf8");
  const rows = parseOutreachLedger(csv);
  const ledgerErrors = validateOutreachLedger(rows);

  if (ledgerErrors.length > 0) {
    for (const error of ledgerErrors) {
      console.error(`OUTREACH_PACK=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = renderOutreachPacket(rows, { batchPath });
  const packetErrors = validateRenderedOutreachPacket(markdown, rows);

  if (packetErrors.length > 0) {
    for (const error of packetErrors) {
      console.error(`OUTREACH_PACK=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(outputPath, `${markdown}\n`, "utf8");
  console.log(`OUTREACH_PACK=pass rows=${rows.length} path=${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
