import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { analyzeTraceReadyFile, createCompliancePack, type TraceGeometry } from "./eudr";

const polygon = { type: "Polygon", coordinates: [[[10, 10], [12, 10], [12, 12], [10, 10]]] };
const point = { type: "Point", coordinates: [10, 10] };
const properties = { farm_id: "SYNTHETIC-1", supplier_name: "Fictional Cooperative", country: "Fictionland", commodity: "cocoa", batch_id: "SYNTHETIC-BATCH" };

function file(format: string, area?: string, geometry: TraceGeometry = point) {
  if (format === "csv") {
    return new File([`farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude\nSYNTHETIC-1,Fictional Cooperative,Fictionland,cocoa,SYNTHETIC-BATCH,${area ?? ""},10,10\n`], "synthetic.csv");
  }
  if (format === "kml") {
    const values = { ...properties, ...(area === undefined ? {} : { area_ha: area }) };
    return new File([`<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><ExtendedData>${Object.entries(values).map(([name, value]) => `<Data name="${name}"><value>${value}</value></Data>`).join("")}</ExtendedData><Point><coordinates>10,10</coordinates></Point></Placemark></kml>`], "synthetic.kml");
  }
  return new File([JSON.stringify({ type: "Feature", properties: { ...properties, area_ha: area }, geometry })], "synthetic.geojson");
}

async function inspect(input: File) {
  const analysis = await analyzeTraceReadyFile(input);
  const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
  const checklist = JSON.parse(await zip.file("traceready-eudr-checklist.json")!.async("string"));
  const threshold = checklist.checks.find((check: { id: string }) => check.id === "polygon_threshold");
  const csv = Papa.parse<Record<string, string>>(await zip.file("traceready-cleaned-farms.csv")!.async("string"), { header: true, skipEmptyLines: true }).data;
  return { analysis, threshold, csv, zip };
}

describe("area-dependent polygon readiness", () => {
  it.each(["csv", "geojson", "kml"])("keeps a %s point with unknown area unresolved on screen and in the ZIP", async format => {
    const { analysis, threshold, csv, zip } = await inspect(file(format));
    expect(analysis.records[0].areaHa).toBeNull();
    expect(csv[0].area_ha).toBe("");
    expect(analysis.issues).toContainEqual(expect.objectContaining({ severity: "warning", field: "area_ha", message: expect.stringContaining("unresolved") }));
    expect(analysis.summary.warnings).toBe(1);
    expect(analysis.summary.readinessScore).toBeLessThan(100);
    expect(threshold.status).toBe("review");
    expect(threshold.evidence).toContain("unknown area");
    expect(await zip.file("traceready-buyer-summary.txt")!.async("string")).toContain("Ready for review with warnings");
  });

  it.each(["-1", "0", "not-measured", "Infinity"])("flags supplied invalid area %s and preserves its evidence", async area => {
    const { analysis, threshold, csv, zip } = await inspect(file("csv", area));
    expect(analysis.summary.readyRecords).toBe(0);
    expect(analysis.summary.readinessScore).toBeLessThan(100);
    expect(threshold.status).toBe("blocker_or_review");
    expect(analysis.issues).toContainEqual(expect.objectContaining({ severity: "blocker", field: "area_ha", message: expect.stringContaining(area) }));
    expect(csv[0].area_ha).toBe(Number.isFinite(Number(area)) ? area : "");
    expect(await zip.file("traceready-issues.csv")!.async("string")).toContain(area);
  });

  it("does not let valid polygon geometry hide a supplied invalid area", async () => {
    const { analysis, threshold } = await inspect(file("geojson", "-1", polygon));
    expect(analysis.records[0].geometry).toEqual(polygon);
    expect(analysis.summary.readyRecords).toBe(0);
    expect(threshold.status).not.toBe("pass");
  });

  it("retains a valid polygon without inventing its unknown area", async () => {
    const { analysis, threshold, csv } = await inspect(file("geojson", undefined, polygon));
    expect(analysis.records[0].geometry).toEqual(polygon);
    expect(analysis.records[0].areaHa).toBeNull();
    expect(csv[0].area_ha).toBe("");
    expect(analysis.summary.blockers).toBe(0);
    expect(analysis.summary.warnings).toBe(0);
    expect(threshold.status).toBe("pass");
  });

  it.each([["4", "pass"], ["4.01", "blocker_or_review"]])("retains the existing threshold for a point of %s hectares", async (area, status) => {
    const { analysis, threshold } = await inspect(file("csv", area));
    expect(threshold.status).toBe(status);
    expect(analysis.issues.some(issue => issue.code === "polygon_required")).toBe(Number(area) > 4);
    expect(analysis.records[0].areaHa).toBe(Number(area));
  });

  it("does not let a known polygon resolve another record's unknown point area", async () => {
    const input = new File([JSON.stringify({ type: "FeatureCollection", features: [
      { type: "Feature", properties, geometry: point },
      { type: "Feature", properties: { ...properties, farm_id: "SYNTHETIC-2", area_ha: 6 }, geometry: polygon },
    ] })], "mixed.geojson");
    const { analysis, threshold } = await inspect(input);
    expect(analysis.summary.totalRecords).toBe(2);
    expect(analysis.summary.warnings).toBe(1);
    expect(threshold.status).toBe("review");
  });
});
