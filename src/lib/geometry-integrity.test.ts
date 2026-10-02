import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { analyzeTraceReadyFile, createCompliancePack } from "./eudr";

const outer = [[10, 10], [14, 10], [14, 14], [10, 14], [10, 10]];
const hole = [[11, 11], [11, 12], [12, 12], [12, 11], [11, 11]];
const properties = { farm_id: "F1", supplier_name: "Coop", country: "Ghana", commodity: "cocoa", batch_id: "B1", area_ha: 6 };
async function inspect(geometry: unknown) {
  return analyzeTraceReadyFile(new File([JSON.stringify({ type: "Feature", properties, geometry })], "plots.geojson"));
}

describe("farm geometry integrity", () => {
  it.each([
    ["out-of-range vertex hidden by a valid average", { type: "Polygon", coordinates: [[[10, 10], [200, 10], [10, 14], [10, 10]]] }],
    ["malformed interior vertex", { type: "Polygon", coordinates: [[[10, 10], ["bad", 11], [14, 14], [10, 10]]] }],
    ["unclosed hole", { type: "Polygon", coordinates: [outer, hole.slice(0, -1)] }],
    ["unclosed second polygon", { type: "MultiPolygon", coordinates: [[outer], [hole.slice(0, -1)]] }],
    ["empty polygon with fallback properties", { type: "MultiPolygon", coordinates: [[]] }],
    ["wrong nesting", { type: "Polygon", coordinates: outer }],
    ["collapsed ring", { type: "Polygon", coordinates: [[[10, 10], [10, 10], [10, 10], [10, 10]]] }],
    ["invalid altitude", { type: "Polygon", coordinates: [[[10, 10], [14, 10, "bad"], [14, 14], [10, 10]]] }],
  ])("does not mark %s ready", async (_label, geometry) => {
    const analysis = await inspect(geometry);
    expect(analysis.summary.readyRecords).toBe(0);
    expect(analysis.summary.blockers).toBeGreaterThan(0);
  });

  it("preserves every valid polygon and hole in the ZIP", async () => {
    const geometry = { type: "MultiPolygon", coordinates: [[outer, hole], [outer]] };
    const analysis = await inspect(geometry);
    expect(analysis.summary.blockers).toBe(0);
    const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
    const exported = JSON.parse(await zip.file("traceready-geolocation.geojson")!.async("string"));
    expect(exported.features[0].geometry).toEqual(geometry);
  });

  const ringXml = (ring: number[][]) => `<LinearRing><coordinates>${ring.map(p => p.join(",")).join(" ")}</coordinates></LinearRing>`;
  const polygonXml = `<Polygon><outerBoundaryIs>${ringXml(outer)}</outerBoundaryIs><innerBoundaryIs>${ringXml(hole)}</innerBoundaryIs></Polygon>`;
  function kml(geometry: string, prefix = false) {
    const body = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><ExtendedData>${Object.entries(properties).map(([name, value]) => `<Data name="${name}"><value>${value}</value></Data>`).join("")}</ExtendedData>${geometry}</Placemark></Document></kml>`;
    return new File([prefix ? body.replace(/<(\/?)(\w+)/g, "<$1k:$2").replace('xmlns=', 'xmlns:k=') : body], "plots.kml");
  }

  it.each([false, true])("preserves KML MultiGeometry and holes (prefixed=%s)", async (prefix) => {
    const analysis = await analyzeTraceReadyFile(kml(`<MultiGeometry>${polygonXml}${polygonXml}</MultiGeometry>`, prefix));
    expect(analysis.summary.totalRecords).toBe(1);
    expect(analysis.summary.blockers).toBe(0);
    expect(analysis.records[0].geometry).toEqual({ type: "MultiPolygon", coordinates: [[outer, hole], [outer, hole]] });
    const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
    const exported = JSON.parse(await zip.file("traceready-geolocation.geojson")!.async("string"));
    expect(exported.features[0].geometry).toEqual(analysis.records[0].geometry);
  });

  it.each(["10,10 bad,11 14,14 10,10", "10,10 14, 14,14 10,10", "10,10 14,10,invalid 14,14 10,10"])("rejects malformed KML coordinates without dropping vertices: %s", async (coordinates) => {
    const analysis = await analyzeTraceReadyFile(kml(`<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon>`));
    expect(analysis.summary.readyRecords).toBe(0);
    expect(analysis.summary.blockers).toBeGreaterThan(0);
  });

  it("does not silently discard mixed KML geometry", async () => {
    const analysis = await analyzeTraceReadyFile(kml(`<MultiGeometry>${polygonXml}<Point><coordinates>10,10</coordinates></Point></MultiGeometry>`));
    expect(analysis.summary.readyRecords).toBe(0);
    expect(analysis.summary.blockers).toBeGreaterThan(0);
  });

  it("marks malformed boundaries as blocked in the exported checklist too", async () => {
    const analysis = await inspect({ type: "Polygon", coordinates: [outer, hole.slice(0, -1)] });
    const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
    const checklist = JSON.parse(await zip.file("traceready-eudr-checklist.json")!.async("string"));
    for (const id of ["geolocation_present", "polygon_threshold"]) {
      expect(checklist.checks.find((check: { id: string }) => check.id === id).status).toBe("blocker_or_review");
    }
  });

  it.each(["", "farm_id,supplier_name\n", "{broken-json"])("never exports passing farm checks for empty or unparseable input: %s", async (body) => {
    const analysis = await analyzeTraceReadyFile(new File([body], body.startsWith("{") ? "plots.geojson" : "plots.csv"));
    const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
    const checklist = JSON.parse(await zip.file("traceready-eudr-checklist.json")!.async("string"));
    expect(checklist.checks.filter((check: { id: string }) => check.id !== "pack_contents").every((check: { status: string }) => check.status !== "pass")).toBe(true);
  });

  it("reports malformed collection entries instead of omitting them", async () => {
    const analysis = await analyzeTraceReadyFile(new File([JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", properties, geometry: { type: "Polygon", coordinates: [outer] } }, null] })], "plots.geojson"));
    expect(analysis.issues.some(issue => issue.code === "parse_error")).toBe(true);
    expect(analysis.summary.readyRecords).toBe(0);
  });

  it("exports spreadsheet-safe text while preserving negative numeric coordinates", async () => {
    const analysis = await analyzeTraceReadyFile(new File([JSON.stringify({ type: "Feature", properties: { ...properties, farm_id: "=1+1", supplier_name: "  @SUM(1)", batch_id: "+1+1", area_ha: 2 }, geometry: { type: "Point", coordinates: [-76, -6] } })], "plots.geojson"));
    const zip = await JSZip.loadAsync(await (await createCompliancePack(analysis)).arrayBuffer());
    const csv = await zip.file("traceready-cleaned-farms.csv")!.async("string");
    const rows = Papa.parse<Record<string, string>>(csv, { header: true }).data;
    expect(rows[0].farm_id).toBe("'=1+1");
    expect(rows[0].supplier_name).toBe("'@SUM(1)");
    expect(rows[0].batch_id).toBe("'+1+1");
    expect(rows[0].longitude).toBe("-76");
    expect(rows[0].latitude).toBe("-6");
  });
});
