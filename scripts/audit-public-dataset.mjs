import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";
import Papa from "papaparse";

export const COLOMBIAN_COCOA_DATASET = {
  title: "Colombian-Cocoa-Dataset",
  kaggleRef: "lehetasa/colombian-cocoa-dataset",
  datasetUrl: "https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset",
  downloadUrl: "https://www.kaggle.com/api/v1/datasets/download/lehetasa/colombian-cocoa-dataset",
  metadataUrl: "https://apolo.unab.edu.co/en/datasets/colombian-cocoa-dataset-soil-aptitude/",
  sourceLicense: "CC BY-NC-SA 4.0",
  sourceCountry: "Colombia",
  sourceCommodity: "cocoa",
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildTraceReadyAuditCsv(sourceRows, options = {}) {
  const rows = sourceRows.map((row) => ({
    country: options.country ?? valueFrom(row, ["country", "Country", "origin", "Origin"]),
    commodity: options.commodity ?? valueFrom(row, ["commodity", "Commodity", "crop", "Crop"]),
    batch_id: options.batchId ?? "",
    area_ha: valueFrom(row, ["area_ha", "area_ha.1", "Area_ha", "hectares", "ha"]),
    latitude: valueFrom(row, ["Latitude", "latitude", "lat", "y"]),
    longitude: valueFrom(row, ["Longitude", "longitude", "lon", "lng", "x"]),
  }));

  return toCsv(["country", "commodity", "batch_id", "area_ha", "latitude", "longitude"], rows);
}

export function summarizeTraceReadyAnalysis(analysis, metadata) {
  const issueCounts = countBy(analysis.issues, (issue) => issue.code);
  const recordsOver4Ha = analysis.records.filter((record) => (record.areaHa ?? 0) > 4).length;
  const geolocatedRecords = analysis.records.filter(
    (record) => record.latitude !== null && record.longitude !== null,
  ).length;
  const polygonRecords = analysis.records.filter(
    (record) => record.geometryType === "Polygon" || record.geometryType === "MultiPolygon",
  ).length;
  const pointOnlyOver4Ha = issueCounts.polygon_required ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    datasetTitle: metadata.datasetTitle,
    datasetUrl: metadata.datasetUrl,
    sourceRows: metadata.sourceRows,
    sourceLicense: metadata.sourceLicense,
    analyzedRecords: analysis.summary.totalRecords,
    readyRecords: analysis.summary.readyRecords,
    blockers: analysis.summary.blockers,
    warnings: analysis.summary.warnings,
    readinessScore: analysis.summary.readinessScore,
    recordsOver4Ha,
    geolocatedRecords,
    polygonRecords,
    pointOnlyOver4Ha,
    issueCounts,
    headline:
      `TraceReady checked ${analysis.summary.totalRecords.toLocaleString()} public cocoa rows: ` +
      `${pointOnlyOver4Ha.toLocaleString()} point-only plots over 4 hectares, ` +
      `${(issueCounts.missing_farmId ?? 0).toLocaleString()} rows without plot IDs, and ` +
      `${(issueCounts.missing_supplier ?? 0).toLocaleString()} rows without supplier identity.`,
  };
}

export function renderMiniAuditMarkdown(audit) {
  const issueRows = Object.entries(audit.issueCounts)
    .sort(([, left], [, right]) => right - left)
    .map(([code, count]) => `| \`${code}\` | ${count.toLocaleString()} |`);

  return `# TraceReady public dataset mini-audit

Generated: ${audit.generatedAt}

## Source

- Dataset: [${audit.datasetTitle}](${audit.datasetUrl})
- License reported by Kaggle API: ${audit.sourceLicense}
- Rows downloaded: ${audit.sourceRows.toLocaleString()}
- Rows analyzed by TraceReady: ${audit.analyzedRecords.toLocaleString()}

This is not a customer file, transaction proof, legal certification, or a due diligence statement. It is a public-dataset stress test showing what happens when a geolocation-heavy cocoa dataset is treated like a buyer handoff file.

## Method

TraceReady used the public row-level \`area_ha\`, \`Latitude\`, and \`Longitude\` columns. The audit supplied \`country=Colombia\` and \`commodity=cocoa\` from the dataset metadata so the result focuses on file-readiness gaps rather than penalizing the source for metadata that can reasonably live outside a CSV.

It did not fabricate farm IDs, supplier names, batch IDs, or polygon geometries.

Rule reference: [CBI EUDR coffee guidance](https://www.cbi.eu/market-information/coffee/tips-become-eudr-compliant) states that polygon mapping is mandatory for coffee plots larger than 4 hectares. TraceReady applies the same launch-readiness threshold to coffee and cocoa file checks.

## Result

${audit.headline}

| Check | Count |
| --- | ---: |
| Records analyzed | ${audit.analyzedRecords.toLocaleString()} |
| Records with latitude/longitude | ${audit.geolocatedRecords.toLocaleString()} |
| Records over 4 hectares | ${audit.recordsOver4Ha.toLocaleString()} |
| Polygon records present | ${audit.polygonRecords.toLocaleString()} |
| Point-only plots over 4 hectares | ${audit.pointOnlyOver4Ha.toLocaleString()} |
| Blockers found | ${audit.blockers.toLocaleString()} |
| Warnings found | ${audit.warnings.toLocaleString()} |
| Ready records | ${audit.readyRecords.toLocaleString()} |
| Readiness score | ${audit.readinessScore}/100 |

## Issue Codes

| TraceReady issue | Count |
| --- | ---: |
${issueRows.join("\n")}

## What This Proves

A dataset can have farm coordinates and still be unusable as a buyer-ready EUDR handoff. The obvious failure mode is not fancy satellite risk scoring. It is dirty input structure: missing plot IDs, missing supplier identity, missing shipment linkage, and point-only plots over 4 hectares where polygon geometry is needed.

That is the TraceReady wedge: inspect the file before the buyer, importer, consultant, or enterprise EUDR platform has to reject it.

## Outreach Angle

I ran a public cocoa farm-location dataset through TraceReady. Even after giving it the benefit of the doubt on country and commodity, the file still had ${audit.pointOnlyOver4Ha.toLocaleString()} point-only plots over 4 hectares, ${(audit.issueCounts.missing_farmId ?? 0).toLocaleString()} rows without plot IDs, and ${(audit.issueCounts.missing_supplier ?? 0).toLocaleString()} rows without supplier identity. If you have one supplier CSV, KML, or GeoJSON file, I can run the same check and send back the exact rows that need cleanup before buyer review.

## Cold DM

Hi [Name] - quick, specific note. I am a software operator, not an EUDR consultant, so I am not going to pitch a compliance platform.

I ran a public cocoa farm-location dataset through a file-readiness checker I built. Even after assuming the file was Colombian cocoa, it still had ${audit.pointOnlyOver4Ha.toLocaleString()} point-only plots over 4 hectares, ${(audit.issueCounts.missing_farmId ?? 0).toLocaleString()} rows without plot IDs, and ${(audit.issueCounts.missing_supplier ?? 0).toLocaleString()} rows without supplier identity.

That is the narrow problem I am looking for: not "buy software," just "is this supplier file going to create buyer-review rework?"

You can run one CSV, KML, or GeoJSON file in the browser first, before sending me anything. If the issue list is useful and you want concierge cleanup, I can turn one file into a cleaned pack and row-level issue log.

Worth testing one messy supplier file?

## Build-in-public Post Draft

I analyzed 57,658 public cocoa farm-location rows because I wanted to test a blunt assumption:

A file can have coordinates and still fail as a buyer-ready EUDR handoff.

The public dataset had latitude, longitude, and area values. That sounds geospatially useful. But when I treated it like a coffee/cocoa buyer handoff file, the operational gaps were immediate:

- ${audit.pointOnlyOver4Ha.toLocaleString()} point-only plots over 4 hectares
- ${(audit.issueCounts.missing_farmId ?? 0).toLocaleString()} rows without plot IDs
- ${(audit.issueCounts.missing_supplier ?? 0).toLocaleString()} rows without supplier identity
- ${(audit.issueCounts.missing_batch ?? 0).toLocaleString()} rows without shipment or lot linkage

This is why I am building TraceReady as a cleanup desk, not another enterprise compliance platform. Small importers, exporters, and specialty teams do not always need a new system first. Sometimes they need the current supplier CSV/KML/GeoJSON file to stop being broken.

TraceReady's job is narrow: show the row-level issues, keep the first check browser-side, and create a cleaned buyer pack when the file needs hands-on cleanup.

Not legal certification. Not a TRACES submission. Just operational file readiness before buyer review.

## Guardrail

TraceReady is operational file cleanup and readiness checking, not legal certification. It does not certify EUDR compliance, submit to TRACES, perform legal due diligence, or prove deforestation-free status.
`;
}

export async function runColombianCocoaAudit(options = {}) {
  const cacheDir =
    options.cacheDir ?? path.join(os.tmpdir(), "traceready-public-datasets", "colombian-cocoa-dataset");
  const zipBuffer = await downloadDatasetZip(COLOMBIAN_COCOA_DATASET.downloadUrl, cacheDir);
  const csvText = await extractFirstCsv(zipBuffer);
  const sourceRows = parseSourceRows(csvText);
  const selectedRows = options.limit ? sourceRows.slice(0, options.limit) : sourceRows;
  const traceReadyCsv = buildTraceReadyAuditCsv(selectedRows, {
    country: COLOMBIAN_COCOA_DATASET.sourceCountry,
    commodity: COLOMBIAN_COCOA_DATASET.sourceCommodity,
  });
  const { analyzeTraceReadyFile } = await import(pathToFileURL(path.join(REPO_ROOT, "src", "lib", "eudr.ts")).href);
  const analysis = await analyzeTraceReadyFile(
    new File([traceReadyCsv], "colombian-cocoa-public-audit.csv", { type: "text/csv" }),
  );

  return summarizeTraceReadyAnalysis(analysis, {
    datasetTitle: COLOMBIAN_COCOA_DATASET.title,
    datasetUrl: COLOMBIAN_COCOA_DATASET.datasetUrl,
    sourceRows: selectedRows.length,
    sourceLicense: COLOMBIAN_COCOA_DATASET.sourceLicense,
  });
}

async function downloadDatasetZip(downloadUrl, cacheDir) {
  await fs.mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, "dataset.zip");

  if (existsSync(cachePath)) {
    const cached = await fs.readFile(cachePath);

    if (cached.length > 0) {
      return cached;
    }
  }

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to download dataset: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(cachePath, buffer);

  return buffer;
}

async function extractFirstCsv(zipBuffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const csvEntry = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".csv"));

  if (!csvEntry) {
    throw new Error("Dataset zip did not contain a CSV file.");
  }

  return csvEntry.async("string");
}

function parseSourceRows(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`Dataset CSV parse failed: ${parsed.errors[0].message}`);
  }

  return parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

function valueFrom(row, names) {
  for (const name of names) {
    const value = row[name];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function toCsv(columns, rows) {
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const markdownPath = valueAfter("--markdown");
  const jsonPath = valueAfter("--json");
  const limitValue = valueAfter("--limit");
  const limit = limitValue ? Number.parseInt(limitValue, 10) : 0;
  const audit = await runColombianCocoaAudit({ limit: Number.isFinite(limit) ? limit : 0 });
  const markdown = renderMiniAuditMarkdown(audit);

  if (markdownPath) {
    await fs.writeFile(path.resolve(markdownPath), markdown);
  }

  if (jsonPath) {
    await fs.writeFile(path.resolve(jsonPath), `${JSON.stringify(audit, null, 2)}\n`);
  }

  if (!markdownPath && !jsonPath) {
    console.log(JSON.stringify(audit, null, 2));
  }
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return "";
  }

  return process.argv[index + 1] ?? "";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
