import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";

export const PUBLIC_PILOT_PACK_DIR = "samples/traceready-public-cocoa-pilot";
export const PUBLIC_PILOT_PACK_ZIP = "traceready-public-cocoa-pilot-pack.zip";

export const PUBLIC_COCOA_PILOT_AUDIT = {
  generatedAt: "2026-06-16T10:58:05.523Z",
  datasetTitle: "Colombian-Cocoa-Dataset",
  datasetUrl: "https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset",
  sourceLicense: "CC BY-NC-SA 4.0",
  sourceCountry: "Colombia",
  sourceCommodity: "cocoa",
  analyzedRecords: 57658,
  geolocatedRecords: 57658,
  recordsOver4Ha: 46134,
  polygonRecords: 0,
  pointOnlyOver4Ha: 46134,
  blockers: 161450,
  warnings: 57658,
  readyRecords: 0,
  readinessScore: 0,
  issueCounts: {
    missing_farmId: 57658,
    missing_supplier: 57658,
    missing_batch: 57658,
    polygon_required: 46134,
  },
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DATE = new Date("2026-06-16T12:00:00.000Z");

export function renderPublicPilotPackFiles(audit = PUBLIC_COCOA_PILOT_AUDIT) {
  return {
    "README.txt": renderReadme(audit),
    "public-cocoa-pilot-readiness-report.txt": renderReadinessReport(audit),
    "public-cocoa-pilot-issue-summary.csv": renderIssueSummaryCsv(audit),
    "public-cocoa-pilot-buyer-summary.txt": renderBuyerSummary(audit),
    "public-cocoa-pilot-buyer-followups.txt": renderBuyerFollowups(audit),
    "public-cocoa-pilot-audit.json": `${JSON.stringify(audit, null, 2)}\n`,
  };
}

export async function writePublicPilotPack(options = {}) {
  const publicDir = options.publicDir ?? path.join(REPO_ROOT, "public");
  const packDir = path.join(publicDir, PUBLIC_PILOT_PACK_DIR);
  const zipPath = path.join(publicDir, PUBLIC_PILOT_PACK_ZIP);
  const files = renderPublicPilotPackFiles(options.audit ?? PUBLIC_COCOA_PILOT_AUDIT);
  const zip = new JSZip();

  await fs.mkdir(packDir, { recursive: true });

  for (const [filename, content] of Object.entries(files)) {
    await fs.writeFile(path.join(packDir, filename), content);
    zip.file(filename, content, { date: PACK_DATE });
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  await fs.writeFile(zipPath, zipBuffer);

  return {
    packDir,
    zipPath,
    files: Object.keys(files),
  };
}

function renderReadme(audit) {
  return `TraceReady public cocoa pilot evidence pack

Purpose:
This pack documents the current public-data pilot behind TraceReady's proof page. It is derived from a public cocoa dataset and TraceReady's deterministic file-readiness checks.

Source:
- Dataset: ${audit.datasetTitle}
- URL: ${audit.datasetUrl}
- License reported by the source audit: ${audit.sourceLicense}
- Rows analyzed by TraceReady: ${formatNumber(audit.analyzedRecords)}

Included files:
- public-cocoa-pilot-readiness-report.txt
- public-cocoa-pilot-issue-summary.csv
- public-cocoa-pilot-buyer-summary.txt
- public-cocoa-pilot-buyer-followups.txt
- public-cocoa-pilot-audit.json

Important boundary:
This ZIP does not redistribute raw source rows, latitude/longitude records, supplier lists, buyer files, or customer material. It contains derived issue counts, method notes, and buyer follow-up output only.

This is not a customer case, paid transaction, buyer approval, legal certification, audit assurance, TRACES submission, or due-diligence statement.
`;
}

function renderReadinessReport(audit) {
  return `TraceReady public cocoa pilot readiness report

Status: Not buyer-ready
Readiness score: ${audit.readinessScore}/100

Input:
Public Colombian cocoa dataset rows with latitude, longitude, and area values. TraceReady supplied country=${audit.sourceCountry} and commodity=${audit.sourceCommodity} from public dataset metadata so the check focused on handoff-readiness gaps.

Exact results:
- Records analyzed: ${formatNumber(audit.analyzedRecords)}
- Records with latitude/longitude: ${formatNumber(audit.geolocatedRecords)}
- Records over 4 hectares: ${formatNumber(audit.recordsOver4Ha)}
- Polygon records present: ${formatNumber(audit.polygonRecords)}
- Point-only plots over 4 hectares: ${formatNumber(audit.pointOnlyOver4Ha)}
- Blockers found: ${formatNumber(audit.blockers)}
- Warnings found: ${formatNumber(audit.warnings)}
- Ready records: ${formatNumber(audit.readyRecords)}

What changed:
- Country and commodity were supplied from public metadata.
- Missing plot IDs, supplier identity, batch linkage, and polygon geometry were left missing.
- TraceReady generated issue evidence and buyer/supplier follow-up questions instead of inventing data.

Output:
The usable output is an issue summary, buyer handoff summary, and follow-up list for buyer or supplier review. This public pilot cannot produce a cleaned compliant handoff because the missing identifiers and polygon boundaries are not present in the source row data.
`;
}

function renderIssueSummaryCsv(audit) {
  const rows = [
    ["metric", "count", "note"],
    ["records_analyzed", audit.analyzedRecords, "Public cocoa rows checked"],
    ["records_with_latitude_longitude", audit.geolocatedRecords, "Coordinate fields were present"],
    ["records_over_4ha", audit.recordsOver4Ha, "Area exceeds launch-readiness polygon threshold"],
    ["polygon_records_present", audit.polygonRecords, "No polygon geometry was present"],
    ["point_only_over_4ha", audit.pointOnlyOver4Ha, "Large plots with point-only coordinates"],
    ["missing_plot_ids", audit.issueCounts.missing_farmId, "No row-level farm or plot identifier"],
    ["missing_supplier_identity", audit.issueCounts.missing_supplier, "No supplier identity in buyer-handoff view"],
    ["missing_shipment_linkage", audit.issueCounts.missing_batch, "No batch or lot linkage"],
    ["blockers_found", audit.blockers, "Total blocker issues"],
    ["warnings_found", audit.warnings, "Total warning issues"],
    ["ready_records", audit.readyRecords, "Records ready without follow-up"],
  ];

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function renderBuyerSummary(audit) {
  return `TraceReady public cocoa pilot buyer handoff summary

Buyer handoff summary
Decision: hold for source-owner repair

Input reviewed:
- Public dataset: ${audit.datasetTitle}
- Rows analyzed: ${formatNumber(audit.analyzedRecords)}
- Commodity/country used for the check: ${audit.sourceCommodity} / ${audit.sourceCountry}

Why this file is not buyer-ready:
- ${formatNumber(audit.pointOnlyOver4Ha)} plots are over 4 hectares but only have point coordinates.
- ${formatNumber(audit.issueCounts.missing_farmId)} rows need stable plot or farm IDs.
- ${formatNumber(audit.issueCounts.missing_supplier)} rows need supplier, producer, farmer, cooperative, or supplier-ID identity.
- ${formatNumber(audit.issueCounts.missing_batch)} rows need batch, lot, shipment, or buyer handoff linkage.

Cleaned pack outcome:
The cleaned output is a repair brief, not a fabricated compliance file. TraceReady can produce the issue summary, this buyer handoff summary, and the source-owner follow-up list from the public input. It cannot truthfully produce a cleaned CSV or normalized GeoJSON because the missing IDs, shipment linkage, supplier identity, and polygon boundaries are not present in the source rows.

What a real customer file would need before cleanup:
1. Stable plot or farm IDs.
2. Supplier identity fields accepted by the buyer.
3. Batch, lot, shipment, or purchase-order linkage.
4. Polygon geometry or buyer-approved evidence for point-only plots over 4 hectares.

TraceReady boundary:
TraceReady did not invent missing supplier IDs, plot IDs, batch IDs, or polygon boundaries for this public pilot.
`;
}

function renderBuyerFollowups(audit) {
  return `TraceReady public cocoa pilot buyer/supplier follow-up list

1. Provide stable plot or farm IDs for ${formatNumber(audit.issueCounts.missing_farmId)} rows.
2. Provide supplier, producer, farmer, cooperative, or supplier-ID identity for ${formatNumber(audit.issueCounts.missing_supplier)} rows.
3. Provide batch, lot, shipment, or buyer handoff linkage for ${formatNumber(audit.issueCounts.missing_batch)} rows.
4. Provide polygon geometry or buyer-approved evidence for ${formatNumber(audit.pointOnlyOver4Ha)} point-only plots over 4 hectares.
5. Confirm whether the buyer accepts metadata supplied outside the file for country and commodity.

TraceReady did not fabricate any of the missing fields above. The point of this pilot is to show the exact rework list before a buyer, importer, consultant, or EUDR platform has to reject the handoff.
`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await writePublicPilotPack();
  console.log(`PUBLIC_PILOT_PACK_DIR=${result.packDir}`);
  console.log(`PUBLIC_PILOT_PACK_ZIP=${result.zipPath}`);
  console.log(`PUBLIC_PILOT_PACK_FILES=${result.files.join(",")}`);
}
