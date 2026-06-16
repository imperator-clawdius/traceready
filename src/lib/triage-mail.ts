import {
  formatOutreachAttributionLines,
  parseOutreachAttribution,
  type OutreachAttribution,
} from "./outreach-attribution";
import { CONTACT_EMAIL } from "./site";

export const TRIAGE_MAIL_SUBJECT = "TraceReady free issue-log triage";

const TRIAGE_BODY_LINES = [
  "TraceReady free issue-log triage",
  "",
  "Do not include raw coordinates or confidential supplier data in this first email.",
  "",
  "Commodity:",
  "Source country:",
  "Buyer/importer deadline:",
  "File type: CSV, KML, GeoJSON, Excel export, or mixed",
  "",
  "Issue counts from TraceReady:",
  "- Blockers:",
  "- Warnings:",
  "- Point-only over-4ha records:",
  "- Missing plot IDs:",
  "- Missing supplier identity:",
  "- Duplicate farm IDs:",
  "",
  "Non-sensitive field names or sample row shape:",
  "",
  "What I need back: quick triage, 24-hour cleanup quote, or pilot scope",
];

export function buildTriageMailBody(attribution?: OutreachAttribution | null): string {
  const attributionLines = formatOutreachAttributionLines(attribution);

  return [...TRIAGE_BODY_LINES, ...(attributionLines.length > 0 ? ["", ...attributionLines] : [])].join("\n");
}

export function buildTriageMailto(search = ""): string {
  const attribution = parseOutreachAttribution(search);
  const subject = encodeURIComponent(TRIAGE_MAIL_SUBJECT);
  const body = encodeURIComponent(buildTriageMailBody(attribution));

  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
