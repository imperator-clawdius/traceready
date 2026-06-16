import { describe, expect, it } from "vitest";
import {
  auditOutreachRoutes,
  checkOutreachRoute,
  parseOutreachRouteAuditArgs,
  renderOutreachRouteAudit,
} from "./audit-outreach-routes.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,message_variant,proof_hook,ask,status,next_step
1,b01-r01,association,European Coffee Federation,EU coffee association,Represents the European coffee sector,public website,https://www.ecf-coffee.org/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r01,association,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for member education route,not_started,Send association variant
2,b01-r02,importer,Cafe Imports Europe,specialty green coffee importer,Public Europe contact route,public contact page,https://www.cafeimports.com/europe/blog/general-contact/,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r02,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask them to run one supplier file browser-side,not_started,Send importer variant
3,b01-r03,importer,Sucafina Specialty Europe,green coffee network,Public EMEA route,public EMEA page,https://sucafina.com/emea,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r03,importer,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Ask for the team that handles supplier file readiness,not_started,Send importer variant
4,b01-r04,overflow,Preferred by Nature,EUDR consultant,Works with responsible sourcing programs,public contact page,https://preferredbynature.org/contact,https://traceready.online/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,https://traceready.online/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer first-pass cleanup desk,not_started,Send overflow variant
`;

describe("outreach route audit", () => {
  it("audits the selected tier and summarizes route health", async () => {
    const rows = parseOutreachLedger(BATCH_CSV);
    const checkedRoutes = [];
    const audit = await auditOutreachRoutes(rows, {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      tier: "importer",
      checkRoute: async (row) => {
        checkedRoutes.push(row.route_id);
        if (row.route_id === "b01-r02") {
          return {
            health: "reachable",
            status: 200,
            finalUrl: row.source_url,
            note: "HTTP 200",
          };
        }

        return {
          health: "manual_check",
          status: 403,
          finalUrl: row.source_url,
          note: "HTTP 403 blocks CLI fetch; inspect manually before sending",
        };
      },
    });

    expect(checkedRoutes).toEqual(["b01-r02", "b01-r03"]);
    expect(audit.summary).toEqual({
      totalRows: 4,
      auditedRows: 2,
      reachable: 1,
      manualCheck: 1,
      unreachable: 0,
      tier: "importer",
      limit: undefined,
    });
    expect(audit.routes.map((route) => [route.route_id, route.health])).toEqual([
      ["b01-r02", "reachable"],
      ["b01-r03", "manual_check"],
    ]);
  });

  it("checks a route with injected fetch and classifies common statuses", async () => {
    const reachable = await checkOutreachRoute("https://example.com/contact", {
      fetchImpl: async () => ({
        status: 301,
        url: "https://www.example.com/contact",
      }),
    });
    const manual = await checkOutreachRoute("https://example.com/protected", {
      fetchImpl: async () => ({
        status: 403,
        url: "https://example.com/protected",
      }),
    });
    const unreachable = await checkOutreachRoute("https://example.com/down", {
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    expect(reachable).toEqual({
      health: "reachable",
      status: 301,
      finalUrl: "https://www.example.com/contact",
      note: "HTTP 301",
    });
    expect(manual).toEqual({
      health: "manual_check",
      status: 403,
      finalUrl: "https://example.com/protected",
      note: "HTTP 403 blocks CLI fetch; inspect manually before sending",
    });
    expect(unreachable).toEqual({
      health: "unreachable",
      status: undefined,
      finalUrl: "https://example.com/down",
      note: "network down",
    });
  });

  it("renders a public-safe markdown report with the next send decision", async () => {
    const audit = await auditOutreachRoutes(parseOutreachLedger(BATCH_CSV), {
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      tier: "importer",
      limit: 1,
      checkRoute: async (row) => ({
        health: "reachable",
        status: 200,
        finalUrl: row.source_url,
        note: "HTTP 200",
      }),
    });
    const markdown = renderOutreachRouteAudit(audit);

    expect(markdown).toContain("# TraceReady outreach route audit");
    expect(markdown).toContain("Batch: `docs/proof-led-outreach-batch-01.csv`");
    expect(markdown).toContain("Tier filter: importer");
    expect(markdown).toContain("Limit: 1");
    expect(markdown).toContain("| b01-r02 | importer | Cafe Imports Europe | reachable | 200 |");
    expect(markdown).toContain("Send first through reachable routes, then manually inspect blocked routes before skipping them.");
    expect(markdown).not.toContain("@");
  });

  it("parses CLI flags for batch, tier, timeout, and limit", () => {
    expect(
      parseOutreachRouteAuditArgs([
        "--batch",
        "docs/proof-led-outreach-batch-01.csv",
        "--tier",
        "importer",
        "--timeout-ms",
        "5000",
        "--limit",
        "3",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      tier: "importer",
      timeoutMs: 5000,
      limit: 3,
    });
  });

  it("defaults to a short per-route timeout for full importer-batch audits", () => {
    expect(parseOutreachRouteAuditArgs([])).toEqual({
      batchPath: "docs/proof-led-outreach-batch-01.csv",
      timeoutMs: 4000,
    });
  });
});
