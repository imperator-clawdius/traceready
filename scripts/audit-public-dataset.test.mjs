import { describe, expect, it } from "vitest";
import { analyzeTraceReadyFile } from "../src/lib/eudr";
import {
  buildTraceReadyAuditCsv,
  renderMiniAuditMarkdown,
  summarizeTraceReadyAnalysis,
} from "./audit-public-dataset.mjs";

function makeFile(body, name = "public-cocoa-audit.csv") {
  return new File([body], name, { type: "text/csv" });
}

describe("public dataset audit utility", () => {
  it("normalizes public cocoa rows without fabricating missing traceability fields", () => {
    const csv = buildTraceReadyAuditCsv(
      [
        {
          area_ha: "5.2",
          Latitude: "4.464943638685195",
          Longitude: "-72.98475870808237",
        },
      ],
      { country: "Colombia", commodity: "cocoa" },
    );

    expect(csv).toContain("country,commodity,batch_id,area_ha,latitude,longitude");
    expect(csv).toContain("Colombia,cocoa,,5.2,4.464943638685195,-72.98475870808237");
    expect(csv).not.toContain("PUBLIC-COCOA");
    expect(csv).not.toContain("farm_id");
    expect(csv).not.toContain("supplier_name");
  });

  it("summarizes TraceReady defects for a metadata-assisted public dataset audit", async () => {
    const csv = buildTraceReadyAuditCsv(
      [
        {
          area_ha: "5.2",
          Latitude: "4.464943638685195",
          Longitude: "-72.98475870808237",
        },
        {
          area_ha: "3.2",
          Latitude: "5.154652698246188",
          Longitude: "-69.66655095776991",
        },
      ],
      { country: "Colombia", commodity: "cocoa" },
    );
    const analysis = await analyzeTraceReadyFile(makeFile(csv));
    const audit = summarizeTraceReadyAnalysis(analysis, {
      datasetTitle: "Fixture Cocoa Dataset",
      datasetUrl: "https://example.com/dataset",
      sourceRows: 2,
      sourceLicense: "CC BY-NC-SA 4.0",
    });

    expect(audit.sourceRows).toBe(2);
    expect(audit.analyzedRecords).toBe(2);
    expect(audit.recordsOver4Ha).toBe(1);
    expect(audit.issueCounts.missing_farmId).toBe(2);
    expect(audit.issueCounts.missing_supplier).toBe(2);
    expect(audit.issueCounts.missing_batch).toBe(2);
    expect(audit.issueCounts.polygon_required).toBe(1);
    expect(audit.issueCounts.missing_country ?? 0).toBe(0);
    expect(audit.issueCounts.missing_commodity ?? 0).toBe(0);
    expect(audit.headline).toContain("2 public cocoa rows");
  });

  it("renders reusable proof copy with the audit counts and guardrails", async () => {
    const csv = buildTraceReadyAuditCsv(
      [
        {
          area_ha: "5.2",
          Latitude: "4.464943638685195",
          Longitude: "-72.98475870808237",
        },
      ],
      { country: "Colombia", commodity: "cocoa" },
    );
    const analysis = await analyzeTraceReadyFile(makeFile(csv));
    const audit = summarizeTraceReadyAnalysis(analysis, {
      datasetTitle: "Fixture Cocoa Dataset",
      datasetUrl: "https://example.com/dataset",
      sourceRows: 1,
      sourceLicense: "CC BY-NC-SA 4.0",
    });
    const markdown = renderMiniAuditMarkdown(audit);

    expect(markdown).toContain("# TraceReady public dataset mini-audit");
    expect(markdown).toContain("This is not a customer file");
    expect(markdown).toContain("point-only plots over 4 hectares");
    expect(markdown).toContain("Outreach Angle");
    expect(markdown).toContain("Cold DM");
    expect(markdown).toContain("Build-in-public Post Draft");
    expect(markdown).toContain("CBI EUDR coffee guidance");
    expect(markdown).toContain("not legal certification");
  });
});
