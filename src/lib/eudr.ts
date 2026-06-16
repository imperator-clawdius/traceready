import JSZip from "jszip";
import Papa from "papaparse";
import { formatOutreachAttributionLines, type OutreachAttribution } from "./outreach-attribution";

export type SupportedFormat = "csv" | "geojson" | "kml";
export type Severity = "blocker" | "warning";
export type Commodity = "coffee" | "cocoa" | "unknown";

type JsonObject = Record<string, unknown>;
type Coordinate = [number, number];

export type TraceGeometry = {
  type: string;
  coordinates: unknown;
};

export type FarmRecord = {
  id: string;
  sourceLabel: string;
  farmId: string;
  supplierName: string;
  supplierId: string;
  country: string;
  commodity: Commodity;
  rawCommodity: string;
  batchId: string;
  areaHa: number | null;
  latitude: number | null;
  longitude: number | null;
  geometryType: string;
  geometry: TraceGeometry | null;
  raw: Record<string, string>;
};

export type ValidationIssue = {
  severity: Severity;
  code: string;
  sourceLabel: string;
  farmId: string;
  field: string;
  message: string;
  suggestion: string;
};

export type TraceReadyAnalysis = {
  fileName: string;
  format: SupportedFormat | "unsupported";
  records: FarmRecord[];
  issues: ValidationIssue[];
  summary: {
    totalRecords: number;
    readyRecords: number;
    blockers: number;
    warnings: number;
    readinessScore: number;
  };
  generatedAt: string;
};

type ParsedInput = {
  records: FarmRecord[];
  issues: ValidationIssue[];
};

const FIELD_ALIASES = {
  farmId: [
    "farm_id",
    "farmid",
    "plot_id",
    "plotid",
    "plot",
    "producer_id",
    "producerid",
    "parcel_id",
    "parcelid",
    "id",
  ],
  supplierName: [
    "supplier",
    "supplier_name",
    "farmer",
    "farmer_name",
    "producer",
    "producer_name",
    "grower",
    "grower_name",
    "name",
  ],
  supplierId: ["supplier_id", "supplierid", "farmer_id", "producer_id", "grower_id"],
  country: ["country", "origin", "country_of_origin", "source_country"],
  commodity: ["commodity", "crop", "product", "material"],
  batchId: ["batch", "batch_id", "lot", "lot_id", "shipment", "shipment_id"],
  areaHa: ["area_ha", "area", "hectares", "farm_size_ha", "plot_area", "ha"],
  latitude: ["lat", "latitude", "y"],
  longitude: ["lon", "lng", "long", "longitude", "x"],
};

export async function analyzeTraceReadyFile(file: File): Promise<TraceReadyAnalysis> {
  const format = detectFormat(file.name);

  if (!format) {
    return createAnalysis(file.name, "unsupported", {
      records: [],
      issues: [
        {
          severity: "blocker",
          code: "unsupported_format",
          sourceLabel: file.name,
          farmId: "",
          field: "file",
          message: "TraceReady currently accepts CSV, KML, GeoJSON, or JSON GeoJSON files.",
          suggestion: "Export the farm file as CSV, KML, or GeoJSON and upload again.",
        },
      ],
    });
  }

  try {
    const text = await file.text();
    const parsed =
      format === "csv"
        ? parseCsv(text)
        : format === "geojson"
          ? parseGeoJson(text)
          : parseKml(text);

    return createAnalysis(file.name, format, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file could not be parsed.";

    return createAnalysis(file.name, format, {
      records: [],
      issues: [
        {
          severity: "blocker",
          code: "parse_error",
          sourceLabel: file.name,
          farmId: "",
          field: "file",
          message,
          suggestion: "Check the file syntax, remove broken rows, and upload it again.",
        },
      ],
    });
  }
}

export async function createCompliancePack(
  analysis: TraceReadyAnalysis,
  outreachAttribution?: OutreachAttribution | null,
): Promise<Blob> {
  const zip = new JSZip();

  zip.file("traceready-readiness-report.txt", buildReport(analysis, outreachAttribution));
  zip.file("traceready-buyer-summary.txt", buildBuyerSummary(analysis, outreachAttribution));
  zip.file("traceready-cleaned-farms.csv", buildCleanedCsv(analysis.records));
  zip.file("traceready-issues.csv", buildIssuesCsv(analysis.issues));
  zip.file("traceready-eudr-checklist.json", JSON.stringify(buildEudrChecklist(analysis, outreachAttribution), null, 2));
  zip.file("traceready-geolocation.geojson", JSON.stringify(buildGeoJson(analysis.records), null, 2));
  zip.file("traceready-paid-cleanup-intake.txt", buildPaidCleanupIntake(analysis, outreachAttribution));

  return zip.generateAsync({ type: "blob" });
}

function detectFormat(fileName: string): SupportedFormat | null {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    return "csv";
  }

  if (lower.endsWith(".geojson") || lower.endsWith(".json")) {
    return "geojson";
  }

  if (lower.endsWith(".kml")) {
    return "kml";
  }

  return null;
}

function parseCsv(text: string): ParsedInput {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const issues: ValidationIssue[] = result.errors.map((error) => ({
    severity: "warning",
    code: "csv_parse_warning",
    sourceLabel: `CSV row ${error.row ?? "unknown"}`,
    farmId: "",
    field: "csv",
    message: error.message,
    suggestion: "Review this row if the cleaned export looks incomplete.",
  }));

  const records = result.data
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim().length > 0))
    .map((row, index) => normalizeRow(row, `CSV row ${index + 2}`));

  return {
    records: records.map((entry) => entry.record),
    issues: issues.concat(records.flatMap((entry) => entry.issues)),
  };
}

function parseGeoJson(text: string): ParsedInput {
  const data = JSON.parse(text) as unknown;
  const features = extractGeoJsonFeatures(data);

  if (features.length === 0) {
    throw new Error("No GeoJSON features were found.");
  }

  const normalized = features.map((feature, index) => {
    const properties = asObject(feature.properties) ?? {};
    const raw = stringifyObject(properties);

    if (feature.id !== undefined && raw.id === undefined) {
      raw.id = String(feature.id);
    }

    return normalizeRow(raw, `GeoJSON feature ${index + 1}`, toTraceGeometry(feature.geometry));
  });

  return {
    records: normalized.map((entry) => entry.record),
    issues: normalized.flatMap((entry) => entry.issues),
  };
}

function parseKml(text: string): ParsedInput {
  if (typeof DOMParser === "undefined") {
    throw new Error("KML parsing is only available in the browser.");
  }

  const xml = new DOMParser().parseFromString(text, "application/xml");

  if (xml.getElementsByTagName("parsererror").length > 0) {
    throw new Error("The KML file is not valid XML.");
  }

  const placemarks = Array.from(xml.getElementsByTagName("Placemark"));

  if (placemarks.length === 0) {
    throw new Error("No KML placemarks were found.");
  }

  const normalized = placemarks.map((placemark, index) => {
    const raw = extractKmlProperties(placemark);
    const name = textFromFirstTag(placemark, "name");

    if (name && !raw.name) {
      raw.name = name;
    }

    return normalizeRow(raw, `KML placemark ${index + 1}`, extractKmlGeometry(placemark));
  });

  return {
    records: normalized.map((entry) => entry.record),
    issues: normalized.flatMap((entry) => entry.issues),
  };
}

function normalizeRow(
  rawInput: Record<string, unknown>,
  sourceLabel: string,
  geometry: TraceGeometry | null = null,
): { record: FarmRecord; issues: ValidationIssue[] } {
  const raw = stringifyObject(rawInput);
  const farmId = getAliasedValue(raw, FIELD_ALIASES.farmId);
  const rawSupplierName = getAliasedValue(raw, FIELD_ALIASES.supplierName);
  const rawSupplierId = getAliasedValue(raw, FIELD_ALIASES.supplierId);
  const country = getAliasedValue(raw, FIELD_ALIASES.country);
  const rawCommodity = getAliasedValue(raw, FIELD_ALIASES.commodity);
  const batchId = getAliasedValue(raw, FIELD_ALIASES.batchId);
  const areaHa = parseNumber(getAliasedValue(raw, FIELD_ALIASES.areaHa));
  const latFromRow = parseNumber(getAliasedValue(raw, FIELD_ALIASES.latitude));
  const lonFromRow = parseNumber(getAliasedValue(raw, FIELD_ALIASES.longitude));
  const geometryPoint = getRepresentativePoint(geometry);
  const issues: ValidationIssue[] = [];
  let latitude = latFromRow ?? geometryPoint?.[1] ?? null;
  let longitude = lonFromRow ?? geometryPoint?.[0] ?? null;

  if (
    latFromRow !== null &&
    lonFromRow !== null &&
    Math.abs(latFromRow) > 90 &&
    Math.abs(latFromRow) <= 180 &&
    Math.abs(lonFromRow) <= 90
  ) {
    latitude = lonFromRow;
    longitude = latFromRow;
    issues.push({
      severity: "warning",
      code: "coordinates_swapped",
      sourceLabel,
      farmId,
      field: "latitude,longitude",
      message: "Latitude and longitude looked swapped, so TraceReady corrected them in the cleaned export.",
      suggestion: "Confirm the corrected coordinates before submitting a due diligence statement.",
    });
  }

  const record: FarmRecord = {
    id: farmId || sourceLabel,
    sourceLabel,
    farmId,
    supplierName: rawSupplierName,
    supplierId: rawSupplierId,
    country,
    commodity: normalizeCommodity(rawCommodity),
    rawCommodity,
    batchId,
    areaHa,
    latitude,
    longitude,
    geometryType: geometry?.type ?? (latitude !== null && longitude !== null ? "Point" : "Missing"),
    geometry,
    raw,
  };

  return { record, issues };
}

function createAnalysis(
  fileName: string,
  format: TraceReadyAnalysis["format"],
  parsed: ParsedInput,
): TraceReadyAnalysis {
  const issues = parsed.issues.concat(validateRecords(parsed.records));
  const blockers = issues.filter((issue) => issue.severity === "blocker").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const blockerRecordIds = new Set(
    issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.sourceLabel),
  );
  const readyRecords = parsed.records.filter((record) => !blockerRecordIds.has(record.sourceLabel)).length;
  const readinessScore =
    parsed.records.length === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 - blockers * 12 - warnings * 3)));

  return {
    fileName,
    format,
    records: parsed.records,
    issues,
    summary: {
      totalRecords: parsed.records.length,
      readyRecords,
      blockers,
      warnings,
      readinessScore,
    },
    generatedAt: new Date().toISOString(),
  };
}

function validateRecords(records: FarmRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const farmIds = new Map<string, FarmRecord[]>();

  for (const record of records) {
    if (record.farmId.trim()) {
      const key = record.farmId.trim().toLowerCase();
      farmIds.set(key, (farmIds.get(key) ?? []).concat(record));
    }

    addRequiredIssue(issues, record, "farmId", record.farmId, "Missing farm or plot ID.");

    if (!record.supplierName.trim() && !record.supplierId.trim()) {
      issues.push({
        severity: "blocker",
        code: "missing_supplier",
        sourceLabel: record.sourceLabel,
        farmId: record.farmId,
        field: "supplier",
        message: "Missing supplier, producer, or farmer identity.",
        suggestion: "Add supplier_name or supplier_id so the lot can be traced to the producer.",
      });
    }

    addRequiredIssue(issues, record, "country", record.country, "Missing country of production.");

    if (!record.rawCommodity.trim()) {
      issues.push({
        severity: "blocker",
        code: "missing_commodity",
        sourceLabel: record.sourceLabel,
        farmId: record.farmId,
        field: "commodity",
        message: "Missing commodity.",
        suggestion: "Set commodity to coffee or cocoa.",
      });
    } else if (record.commodity === "unknown") {
      issues.push({
        severity: "warning",
        code: "unsupported_commodity",
        sourceLabel: record.sourceLabel,
        farmId: record.farmId,
        field: "commodity",
        message: `Commodity "${record.rawCommodity}" is not recognized as coffee or cocoa.`,
        suggestion: "Use coffee or cocoa for the launch workflow.",
      });
    }

    if (!record.batchId.trim()) {
      issues.push({
        severity: "warning",
        code: "missing_batch",
        sourceLabel: record.sourceLabel,
        farmId: record.farmId,
        field: "batch_id",
        message: "Missing batch, lot, or shipment reference.",
        suggestion: "Add a lot or shipment ID to tie farms to the traded consignment.",
      });
    }

    validateCoordinates(issues, record);
    validateGeometry(issues, record);
  }

  for (const group of farmIds.values()) {
    if (group.length > 1) {
      for (const record of group) {
        issues.push({
          severity: "blocker",
          code: "duplicate_farm_id",
          sourceLabel: record.sourceLabel,
          farmId: record.farmId,
          field: "farm_id",
          message: `Duplicate farm ID "${record.farmId}" appears in this file.`,
          suggestion: "Make farm or plot IDs unique before building the compliance pack.",
        });
      }
    }
  }

  return issues;
}

function addRequiredIssue(
  issues: ValidationIssue[],
  record: FarmRecord,
  field: string,
  value: string,
  message: string,
) {
  if (value.trim()) {
    return;
  }

  issues.push({
    severity: "blocker",
    code: `missing_${field}`,
    sourceLabel: record.sourceLabel,
    farmId: record.farmId,
    field,
    message,
    suggestion: `Add ${field} to the source file and rerun TraceReady.`,
  });
}

function validateCoordinates(issues: ValidationIssue[], record: FarmRecord) {
  if (record.latitude === null || record.longitude === null) {
    issues.push({
      severity: "blocker",
      code: "missing_geolocation",
      sourceLabel: record.sourceLabel,
      farmId: record.farmId,
      field: "geolocation",
      message: "Missing latitude/longitude or geometry.",
      suggestion: "Provide farm coordinates as latitude/longitude, a GeoJSON geometry, or a KML placemark.",
    });
    return;
  }

  if (Math.abs(record.latitude) > 90 || Math.abs(record.longitude) > 180) {
    issues.push({
      severity: "blocker",
      code: "invalid_coordinates",
      sourceLabel: record.sourceLabel,
      farmId: record.farmId,
      field: "latitude,longitude",
      message: "Coordinates are outside valid latitude/longitude ranges.",
      suggestion: "Latitude must be between -90 and 90; longitude must be between -180 and 180.",
    });
  }
}

function validateGeometry(issues: ValidationIssue[], record: FarmRecord) {
  const isPolygon = record.geometryType === "Polygon" || record.geometryType === "MultiPolygon";

  if (record.areaHa !== null && record.areaHa > 4 && !isPolygon) {
    issues.push({
      severity: "blocker",
      code: "polygon_required",
      sourceLabel: record.sourceLabel,
      farmId: record.farmId,
      field: "geometry",
      message: "Plots over 4 hectares need polygon geometry for EUDR geolocation readiness.",
      suggestion: "Replace the point with a closed KML or GeoJSON polygon for this farm.",
    });
  }

  if (record.geometryType === "Polygon" && record.geometry && !isPolygonClosed(record.geometry.coordinates)) {
    issues.push({
      severity: "blocker",
      code: "open_polygon",
      sourceLabel: record.sourceLabel,
      farmId: record.farmId,
      field: "geometry",
      message: "Polygon geometry is not closed.",
      suggestion: "Close the polygon ring by repeating the first coordinate at the end.",
    });
  }
}

function extractGeoJsonFeatures(value: unknown): Array<{ id?: unknown; properties?: unknown; geometry?: unknown }> {
  if (!asObject(value)) {
    return [];
  }

  const object = value as JsonObject;

  if (object.type === "FeatureCollection" && Array.isArray(object.features)) {
    return object.features.filter(asObject) as Array<{ id?: unknown; properties?: unknown; geometry?: unknown }>;
  }

  if (object.type === "Feature") {
    return [object as { id?: unknown; properties?: unknown; geometry?: unknown }];
  }

  if (typeof object.type === "string" && "coordinates" in object) {
    return [{ properties: {}, geometry: object }];
  }

  return [];
}

function toTraceGeometry(value: unknown): TraceGeometry | null {
  const object = asObject(value);

  if (!object || typeof object.type !== "string" || !("coordinates" in object)) {
    return null;
  }

  return {
    type: object.type,
    coordinates: object.coordinates,
  };
}

function extractKmlProperties(placemark: Element): Record<string, string> {
  const raw: Record<string, string> = {};

  for (const data of Array.from(placemark.getElementsByTagName("Data"))) {
    const name = data.getAttribute("name");
    const value = textFromFirstTag(data, "value");

    if (name && value) {
      raw[name] = value;
    }
  }

  for (const data of Array.from(placemark.getElementsByTagName("SimpleData"))) {
    const name = data.getAttribute("name");
    const value = data.textContent?.trim() ?? "";

    if (name && value) {
      raw[name] = value;
    }
  }

  return raw;
}

function extractKmlGeometry(placemark: Element): TraceGeometry | null {
  const polygon = placemark.getElementsByTagName("Polygon")[0];

  if (polygon) {
    const coordinates = parseKmlCoordinates(textFromFirstTag(polygon, "coordinates"));

    if (coordinates.length > 0) {
      return {
        type: "Polygon",
        coordinates: [coordinates],
      };
    }
  }

  const point = placemark.getElementsByTagName("Point")[0];

  if (point) {
    const coordinates = parseKmlCoordinates(textFromFirstTag(point, "coordinates"));

    if (coordinates[0]) {
      return {
        type: "Point",
        coordinates: coordinates[0],
      };
    }
  }

  return null;
}

function parseKmlCoordinates(value: string): Coordinate[] {
  return value
    .trim()
    .split(/\s+/)
    .map((entry) => {
      const [lon, lat] = entry.split(",").map((part) => Number(part));
      return Number.isFinite(lon) && Number.isFinite(lat) ? ([lon, lat] as Coordinate) : null;
    })
    .filter((coordinate): coordinate is Coordinate => coordinate !== null);
}

function getRepresentativePoint(geometry: TraceGeometry | null): Coordinate | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Point" && isCoordinate(geometry.coordinates)) {
    return geometry.coordinates;
  }

  const points = collectCoordinates(geometry.coordinates);

  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (memo, point) => ({
      lon: memo.lon + point[0],
      lat: memo.lat + point[1],
    }),
    { lon: 0, lat: 0 },
  );

  return [totals.lon / points.length, totals.lat / points.length];
}

function collectCoordinates(value: unknown): Coordinate[] {
  if (isCoordinate(value)) {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => collectCoordinates(entry));
}

function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function isPolygonClosed(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) {
    return false;
  }

  const ring = coordinates[0] as unknown[];
  const first = ring[0];
  const last = ring[ring.length - 1];

  return ring.length >= 4 && isCoordinate(first) && isCoordinate(last) && first[0] === last[0] && first[1] === last[1];
}

function getAliasedValue(row: Record<string, string>, aliases: string[]): string {
  const normalized = new Map<string, string>();

  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeKey(key), value.trim());
  }

  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias));

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCommodity(value: string): Commodity {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("coffee") || normalized.includes("cafe")) {
    return "coffee";
  }

  if (normalized.includes("cocoa") || normalized.includes("cacao")) {
    return "cocoa";
  }

  return "unknown";
}

function stringifyObject(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      typeof entry === "string" ? entry : entry === null || entry === undefined ? "" : String(entry),
    ]),
  );
}

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonObject) : null;
}

function textFromFirstTag(element: Element, tagName: string): string {
  return element.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? "";
}

function buildReport(analysis: TraceReadyAnalysis, outreachAttribution?: OutreachAttribution | null): string {
  return [
    "TraceReady EUDR Readiness Report",
    `Generated: ${analysis.generatedAt}`,
    `Source file: ${analysis.fileName}`,
    `Detected format: ${analysis.format}`,
    ...formatOutreachAttributionLines(outreachAttribution),
    "",
    `Records checked: ${analysis.summary.totalRecords}`,
    `Ready records: ${analysis.summary.readyRecords}`,
    `Blockers: ${analysis.summary.blockers}`,
    `Warnings: ${analysis.summary.warnings}`,
    `Readiness score: ${analysis.summary.readinessScore}/100`,
    "",
    "Launch scope:",
    "TraceReady cleans and validates CSV, KML, and GeoJSON farm files for coffee and cocoa EUDR pack preparation.",
    "This report is an operational readiness check, not legal certification.",
    "",
    "Issues:",
    ...(analysis.issues.length
      ? analysis.issues.map(
          (issue) =>
            `- [${issue.severity.toUpperCase()}] ${issue.sourceLabel} ${issue.field}: ${issue.message} ${issue.suggestion}`,
        )
      : ["- No blockers or warnings detected."]),
    "",
  ].join("\n");
}

function buildBuyerSummary(analysis: TraceReadyAnalysis, outreachAttribution?: OutreachAttribution | null): string {
  const blockers = analysis.issues.filter((issue) => issue.severity === "blocker");
  const warnings = analysis.issues.filter((issue) => issue.severity === "warning");
  const commodities = uniqueValues(
    analysis.records.map((record) => (record.commodity === "unknown" ? record.rawCommodity : record.commodity)),
  );
  const countries = uniqueValues(analysis.records.map((record) => record.country));
  const status =
    blockers.length > 0
      ? "Needs cleanup before buyer/importer review"
      : warnings.length > 0
        ? "Ready for review with warnings"
        : "No blockers or warnings detected";

  return [
    "TraceReady Buyer / Importer Summary",
    "",
    `Status: ${status}`,
    `Readiness score: ${analysis.summary.readinessScore}/100`,
    `Generated: ${analysis.generatedAt}`,
    `Source file: ${analysis.fileName}`,
    `Detected format: ${analysis.format}`,
    ...formatOutreachAttributionLines(outreachAttribution),
    "",
    "Shipment context detected from file:",
    `- Commodity: ${commodities}`,
    `- Country of production: ${countries}`,
    `- Farm records checked: ${analysis.summary.totalRecords}`,
    `- Records without blockers: ${analysis.summary.readyRecords}`,
    `- Blockers: ${analysis.summary.blockers}`,
    `- Warnings: ${analysis.summary.warnings}`,
    "",
    "Pack contents:",
    "- traceready-cleaned-farms.csv: normalized farm and plot table",
    "- traceready-geolocation.geojson: normalized point and polygon geolocation layer",
    "- traceready-issues.csv: blocker and warning register",
    "- traceready-eudr-checklist.json: structured readiness checklist",
    "- traceready-readiness-report.txt: detailed operational report",
    "- traceready-paid-cleanup-intake.txt: fulfillment note for paid cleanup orders",
    "",
    "Top blockers:",
    ...(blockers.length
      ? blockers.slice(0, 5).map((issue) => `- ${issue.sourceLabel} ${issue.field}: ${issue.message}`)
      : ["- None detected."]),
    "",
    "Top warnings:",
    ...(warnings.length
      ? warnings.slice(0, 5).map((issue) => `- ${issue.sourceLabel} ${issue.field}: ${issue.message}`)
      : ["- None detected."]),
    "",
    "Caveat: TraceReady provides an operational readiness pack. It is not legal certification or a due diligence statement submission.",
    "",
  ].join("\n");
}

function buildPaidCleanupIntake(analysis: TraceReadyAnalysis, outreachAttribution?: OutreachAttribution | null): string {
  const commodities = Array.from(
    new Set(
      analysis.records
        .map((record) => (record.commodity === "unknown" ? record.rawCommodity : record.commodity))
        .filter((commodity) => commodity.trim().length > 0),
    ),
  );
  const countries = Array.from(new Set(analysis.records.map((record) => record.country).filter(Boolean)));

  return [
    "TraceReady Paid Cleanup Intake",
    "",
    "Send this note with the source file or generated ZIP after checkout.",
    ...formatOutreachAttributionLines(outreachAttribution),
    "",
    "Customer details:",
    "- Stripe receipt email:",
    "- Company:",
    "- Contact name:",
    "- Deadline:",
    "- Importer/exporter role:",
    "",
    "File summary:",
    `- Source file: ${analysis.fileName}`,
    `- Detected format: ${analysis.format}`,
    `- Records checked: ${analysis.summary.totalRecords}`,
    `- Blockers: ${analysis.summary.blockers}`,
    `- Warnings: ${analysis.summary.warnings}`,
    `- Commodity: ${commodities.join(", ") || "not detected"}`,
    `- Country: ${countries.join(", ") || "not detected"}`,
    "",
    "What TraceReady needs to finish the paid cleanup:",
    "- Original source file if this ZIP was generated from a browser sample.",
    "- Shipment, batch, or lot reference if missing from the issue log.",
    "- Correct supplier or producer identity for every blocker row.",
    "- Polygon files for any plot over 4 hectares that only has a point.",
    "- Any buyer-specific naming requirements for the final pack.",
    "",
    "Fulfillment target: return cleaned CSV, issues CSV, readiness report, and normalized GeoJSON within 24 hours.",
    "",
  ].join("\n");
}

function buildEudrChecklist(analysis: TraceReadyAnalysis, outreachAttribution?: OutreachAttribution | null) {
  return {
    product: "TraceReady",
    artifact: "EUDR readiness checklist",
    generatedAt: analysis.generatedAt,
    sourceFile: analysis.fileName,
    detectedFormat: analysis.format,
    outreachRouteId: outreachAttribution?.routeId,
    outreachSource: outreachAttribution?.source,
    outreachMedium: outreachAttribution?.medium,
    outreachCampaign: outreachAttribution?.campaign,
    disclaimer: "Operational readiness check only. This is not legal certification.",
    summary: analysis.summary,
    checks: [
      checklistItem(
        "accepted_format",
        "Source file uses a launch-supported format",
        analysis.format === "csv" || analysis.format === "kml" || analysis.format === "geojson",
        hasIssue(analysis, ["unsupported_format", "parse_error"]),
        `${analysis.format}`,
      ),
      checklistItem(
        "coffee_cocoa_scope",
        "Commodity is coffee or cocoa",
        analysis.records.length > 0 && analysis.records.every((record) => record.commodity !== "unknown"),
        hasIssue(analysis, ["missing_commodity", "unsupported_commodity"]),
        uniqueValues(analysis.records.map((record) => record.commodity === "unknown" ? record.rawCommodity : record.commodity)),
      ),
      checklistItem(
        "supplier_identity",
        "Supplier, producer, or farmer identity is present",
        !hasIssue(analysis, ["missing_supplier", "missing_farmId"]),
        hasIssue(analysis, ["missing_supplier", "missing_farmId"]),
        `${analysis.summary.readyRecords}/${analysis.summary.totalRecords} records without blockers`,
      ),
      checklistItem(
        "origin_country",
        "Country of production is present",
        !hasIssue(analysis, ["missing_country"]),
        hasIssue(analysis, ["missing_country"]),
        uniqueValues(analysis.records.map((record) => record.country)),
      ),
      checklistItem(
        "lot_traceability",
        "Batch, lot, or shipment reference is present",
        !hasIssue(analysis, ["missing_batch"]),
        hasIssue(analysis, ["missing_batch"]),
        uniqueValues(analysis.records.map((record) => record.batchId)),
      ),
      checklistItem(
        "geolocation_present",
        "Geolocation is present and coordinates are valid",
        !hasIssue(analysis, ["missing_geolocation", "invalid_coordinates"]),
        hasIssue(analysis, ["missing_geolocation", "invalid_coordinates"]),
        `${analysis.records.filter((record) => record.latitude !== null && record.longitude !== null).length}/${analysis.summary.totalRecords} records geolocated`,
      ),
      checklistItem(
        "polygon_threshold",
        "Plots over 4 hectares use polygon geometry",
        !hasIssue(analysis, ["polygon_required", "open_polygon"]),
        hasIssue(analysis, ["polygon_required", "open_polygon"]),
        `${analysis.records.filter((record) => record.geometryType === "Polygon" || record.geometryType === "MultiPolygon").length} polygon records`,
      ),
      checklistItem(
        "unique_farm_ids",
        "Farm or plot IDs are unique",
        !hasIssue(analysis, ["duplicate_farm_id"]),
        hasIssue(analysis, ["duplicate_farm_id"]),
        `${new Set(analysis.records.map((record) => record.farmId).filter(Boolean)).size} unique farm IDs`,
      ),
      {
        id: "pack_contents",
        label: "TraceReady pack includes operational export artifacts",
        status: "pass",
        evidence:
          "cleaned CSV, issue CSV, readiness report, normalized GeoJSON, EUDR checklist, and paid-cleanup intake note",
      },
    ],
  };
}

function checklistItem(
  id: string,
  label: string,
  passes: boolean,
  needsAttention: boolean,
  evidence: string,
) {
  return {
    id,
    label,
    status: passes ? "pass" : needsAttention ? "blocker_or_review" : "review",
    evidence: evidence || "not detected",
  };
}

function hasIssue(analysis: TraceReadyAnalysis, codes: string[]) {
  return analysis.issues.some((issue) => codes.includes(issue.code));
}

function uniqueValues(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.join(", ") || "not detected";
}

function buildCleanedCsv(records: FarmRecord[]): string {
  return toCsv(
    [
      "source_label",
      "farm_id",
      "supplier_name",
      "supplier_id",
      "country",
      "commodity",
      "batch_id",
      "area_ha",
      "latitude",
      "longitude",
      "geometry_type",
    ],
    records.map((record) => ({
      source_label: record.sourceLabel,
      farm_id: record.farmId,
      supplier_name: record.supplierName,
      supplier_id: record.supplierId,
      country: record.country,
      commodity: record.commodity === "unknown" ? record.rawCommodity : record.commodity,
      batch_id: record.batchId,
      area_ha: record.areaHa ?? "",
      latitude: record.latitude ?? "",
      longitude: record.longitude ?? "",
      geometry_type: record.geometryType,
    })),
  );
}

function buildIssuesCsv(issues: ValidationIssue[]): string {
  return toCsv(
    ["severity", "code", "source_label", "farm_id", "field", "message", "suggestion"],
    issues.length
      ? issues.map((issue) => ({
          severity: issue.severity,
          code: issue.code,
          source_label: issue.sourceLabel,
          farm_id: issue.farmId,
          field: issue.field,
          message: issue.message,
          suggestion: issue.suggestion,
        }))
      : [
          {
            severity: "info",
            code: "no_issues",
            source_label: "",
            farm_id: "",
            field: "",
            message: "No blockers or warnings detected.",
            suggestion: "",
          },
        ],
  );
}

function buildGeoJson(records: FarmRecord[]) {
  return {
    type: "FeatureCollection",
    name: "TraceReady normalized farm geolocation",
    features: records
      .map((record) => {
        const geometry =
          record.geometry ??
          (record.longitude !== null && record.latitude !== null
            ? { type: "Point", coordinates: [record.longitude, record.latitude] }
            : null);

        if (!geometry) {
          return null;
        }

        return {
          type: "Feature",
          properties: {
            source_label: record.sourceLabel,
            farm_id: record.farmId,
            supplier_name: record.supplierName,
            supplier_id: record.supplierId,
            country: record.country,
            commodity: record.commodity,
            batch_id: record.batchId,
            area_ha: record.areaHa,
          },
          geometry,
        };
      })
      .filter((feature) => feature !== null),
  };
}

function toCsv(columns: string[], rows: Array<Record<string, string | number | null>>): string {
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
