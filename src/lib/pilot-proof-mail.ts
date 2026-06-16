import {
  formatOutreachAttributionLines,
  parseOutreachAttribution,
  type OutreachAttribution,
} from "./outreach-attribution";
import { CONTACT_EMAIL } from "./site";

export const PILOT_PROOF_MAIL_SUBJECT = "TraceReady documented pilot request";

const PILOT_PROOF_BODY_LINES = [
  "TraceReady documented pilot request",
  "",
  "Do not include raw coordinates or confidential supplier data in this first email.",
  "",
  "I want to test whether one real messy file can become an anonymized TraceReady case study.",
  "",
  "Company role: exporter, importer, roaster, consultant, or other",
  "Commodity:",
  "Source country:",
  "Buyer/importer deadline:",
  "File type: CSV, KML, GeoJSON, Excel export, or mixed",
  "",
  "Issue counts from TraceReady or your own review:",
  "- Blockers:",
  "- Warnings:",
  "- Point-only over-4ha records:",
  "- Missing plot IDs:",
  "- Missing supplier identity:",
  "- Duplicate farm IDs:",
  "",
  "Permission boundary if TraceReady helps:",
  "You may publish only with explicit yes:",
  "- You may publish anonymized issue counts: yes/no",
  "- You may publish before/after structure without names or coordinates: yes/no",
  "- You may quote one sentence from us without naming the company: yes/no",
  "",
  "What stays private even if the pilot is useful:",
  "- company name, supplier names, buyer names, coordinates, source rows, shipment references, and buyer documents",
  "",
  "If permission is no, treat the cleanup as private work only: yes/no",
  "",
  "What I need back: documented pilot scope, cleanup quote, or not a fit",
];

export function buildPilotProofMailBody(attribution?: OutreachAttribution | null): string {
  const attributionLines = formatOutreachAttributionLines(attribution);

  return [...PILOT_PROOF_BODY_LINES, ...(attributionLines.length > 0 ? ["", ...attributionLines] : [])].join("\n");
}

export function buildPilotProofMailto(search = ""): string {
  const attribution = parseOutreachAttribution(search);
  const subject = encodeURIComponent(PILOT_PROOF_MAIL_SUBJECT);
  const body = encodeURIComponent(buildPilotProofMailBody(attribution));

  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
