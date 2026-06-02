import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { analyzeTraceReadyFile, createCompliancePack } from "./eudr";

function makeFile(body: string, name: string, type: string) {
  return new File([body], name, { type });
}

describe("TraceReady EUDR validator", () => {
  it("cleans and validates CSV farm records", async () => {
    const csv = `farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude
CSV-1,Ama Mensah,Ghana,coffee,LOT-1,2.2,6.2031,-1.7082
CSV-2,Coop San Pedro,Peru,cocoa,LOT-2,3.8,-6.6232,-78.4420
`;

    const analysis = await analyzeTraceReadyFile(makeFile(csv, "farms.csv", "text/csv"));

    expect(analysis.format).toBe("csv");
    expect(analysis.summary.totalRecords).toBe(2);
    expect(analysis.summary.blockers).toBe(0);
    expect(analysis.records.map((record) => record.commodity)).toEqual(["coffee", "cocoa"]);
  });

  it("extracts GeoJSON points and polygons", async () => {
    const geojson = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            farm_id: "GEO-1",
            supplier_name: "Rio Verde",
            country: "Peru",
            commodity: "cocoa",
            batch_id: "GEO-LOT",
            area_ha: "3.4",
          },
          geometry: {
            type: "Point",
            coordinates: [-76.2412, -6.5821],
          },
        },
        {
          type: "Feature",
          properties: {
            farm_id: "GEO-2",
            supplier_name: "Rio Verde",
            country: "Peru",
            commodity: "cocoa",
            batch_id: "GEO-LOT",
            area_ha: "6.1",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-76.2501, -6.5901],
                [-76.2452, -6.5901],
                [-76.2452, -6.5854],
                [-76.2501, -6.5854],
                [-76.2501, -6.5901],
              ],
            ],
          },
        },
      ],
    });

    const analysis = await analyzeTraceReadyFile(makeFile(geojson, "farms.geojson", "application/geo+json"));

    expect(analysis.format).toBe("geojson");
    expect(analysis.summary.totalRecords).toBe(2);
    expect(analysis.summary.blockers).toBe(0);
    expect(analysis.records[1].geometryType).toBe("Polygon");
  });

  it("extracts KML placemark data and geometry", async () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>KML-1</name>
      <ExtendedData>
        <Data name="farm_id"><value>KML-1</value></Data>
        <Data name="supplier_name"><value>Highlands Coffee Coop</value></Data>
        <Data name="country"><value>Uganda</value></Data>
        <Data name="commodity"><value>coffee</value></Data>
        <Data name="batch_id"><value>KML-LOT</value></Data>
        <Data name="area_ha"><value>2.8</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>30.2876,0.3476,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>KML-2</name>
      <ExtendedData>
        <Data name="farm_id"><value>KML-2</value></Data>
        <Data name="supplier_name"><value>Highlands Coffee Coop</value></Data>
        <Data name="country"><value>Uganda</value></Data>
        <Data name="commodity"><value>coffee</value></Data>
        <Data name="batch_id"><value>KML-LOT</value></Data>
        <Data name="area_ha"><value>5.3</value></Data>
      </ExtendedData>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              30.2900,0.3500,0 30.2940,0.3500,0 30.2940,0.3540,0 30.2900,0.3540,0 30.2900,0.3500,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

    const analysis = await analyzeTraceReadyFile(
      makeFile(kml, "farms.kml", "application/vnd.google-earth.kml+xml"),
    );

    expect(analysis.format).toBe("kml");
    expect(analysis.summary.totalRecords).toBe(2);
    expect(analysis.summary.blockers).toBe(0);
    expect(analysis.records.map((record) => record.geometryType)).toEqual(["Point", "Polygon"]);
  });

  it("creates a ZIP compliance pack with core launch artifacts", async () => {
    const csv = `farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude
CSV-1,Ama Mensah,Ghana,coffee,LOT-1,2.2,6.2031,-1.7082
`;
    const analysis = await analyzeTraceReadyFile(makeFile(csv, "farms.csv", "text/csv"));
    const pack = await createCompliancePack(analysis);
    const zip = await JSZip.loadAsync(await pack.arrayBuffer());

    expect(Object.keys(zip.files).sort()).toEqual([
      "traceready-cleaned-farms.csv",
      "traceready-geolocation.geojson",
      "traceready-issues.csv",
      "traceready-paid-cleanup-intake.txt",
      "traceready-readiness-report.txt",
    ]);
    await expect(zip.file("traceready-readiness-report.txt")?.async("string")).resolves.toContain(
      "TraceReady EUDR Readiness Report",
    );
    await expect(zip.file("traceready-paid-cleanup-intake.txt")?.async("string")).resolves.toContain(
      "Stripe receipt email",
    );
  });
});
