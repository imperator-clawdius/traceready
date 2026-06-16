import { describe, expect, it } from "vitest";
import {
  inspectOutreachContactRoute,
  parseOutreachContactReconArgs,
  reconOutreachContactRoutes,
  renderOutreachContactReconSummary,
} from "./recon-outreach-contact-routes.mjs";
import { parseOutreachLedger } from "./verify-outreach-ledger.mjs";

const BATCH_CSV = `priority,route_id,tier,company_or_channel,segment,why_it_fits,public_route,source_url,proof_url,field_note_url,file_check_url,pilot_proof_url,message_variant,proof_hook,ask,status,next_step
1,b02-r01,overflow,Preferred by Nature,EUDR alignment services,Public EUDR service route,public EUDR service page,https://example.com/eudr,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r01,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r01,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r01,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r01,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer overflow file cleanup,not_started,Send overflow variant
2,b02-r02,overflow,SCS Global Services,EUDR support,Public EUDR support route,public EUDR support page,https://example.com/scs,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r02,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r02,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r02,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r02,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer overflow file cleanup,not_started,Send overflow variant
3,b02-r03,overflow,Control Union,EUDR service intake,Public EUDR service route,public EUDR service page,https://example.com/control,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r03,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer overflow file cleanup,not_started,Send overflow variant
4,b02-r04,overflow,Bureau Veritas,EUDR services,Public EUDR service route,public EUDR service page,https://example.com/bv,https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/field-notes/eudr-file-errors/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,https://traceready.online/pilot-proof/?utm_source=proof_led_batch_02&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b02-r04,overflow,"Lead with 57,658-row public audit and 46,134 point-only over-4ha plots",Offer overflow file cleanup,not_started,Send overflow variant
`;

describe("outreach contact route reconnaissance", () => {
  it("classifies forms, captcha forms, mailto links, and contact-link-only pages", async () => {
    const rows = parseOutreachLedger(BATCH_CSV);
    const recon = await reconOutreachContactRoutes(rows, {
      batchPath: "docs/proof-led-outreach-batch-02.csv",
      tier: "overflow",
      fetchImpl: async (url) => {
        const htmlByUrl = {
          "https://example.com/eudr": "<html><form><input name='email'></form></html>",
          "https://example.com/scs": "<html><form></form><div class='g-recaptcha'></div></html>",
          "https://example.com/control": "<a href='mailto:info@example.com'>Email</a>",
          "https://example.com/bv": "<a href='/contact-us'>Contact us</a>",
        };

        return {
          status: 200,
          url,
          text: async () => htmlByUrl[url],
        };
      },
    });

    expect(recon.summary).toMatchObject({
      totalRows: 4,
      routesInspected: 4,
      candidateBrowserForm: 1,
      formWithCaptcha: 1,
      mailtoVisible: 1,
      contactLinkOnly: 1,
      sourceOnly: 0,
      unreachable: 0,
      tier: "overflow",
    });
    expect(recon.routes.map((route) => [route.route_id, route.recon_status])).toEqual([
      ["b02-r01", "candidate_browser_form"],
      ["b02-r02", "form_with_captcha"],
      ["b02-r03", "mailto_visible"],
      ["b02-r04", "contact_link_only"],
    ]);
    expect(recon.routes[3].contactLinks[0]).toEqual({
      href: "https://example.com/contact-us",
      text: "Contact us",
    });
    expect(renderOutreachContactReconSummary(recon, "private/recon.json")).toContain(
      "candidate_browser_form=1 form_with_captcha=1 mailto_visible=1 contact_link_only=1",
    );
  });

  it("captures unreachable routes without throwing away the rest of the recon", async () => {
    const row = parseOutreachLedger(BATCH_CSV)[0];
    const route = await inspectOutreachContactRoute(row, {
      timeoutMs: 50,
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    expect(route).toMatchObject({
      route_id: "b02-r01",
      recon_status: "unreachable",
      note: "network down",
      formCount: 0,
      hasCaptchaMarker: false,
    });
  });

  it("parses batch, tier, output, limit, timeout, and concurrency flags", () => {
    expect(
      parseOutreachContactReconArgs([
        "--batch",
        "docs/proof-led-outreach-batch-02.csv",
        "--tier",
        "overflow",
        "--limit",
        "5",
        "--timeout-ms",
        "7000",
        "--concurrency",
        "2",
        "--json-output",
        "private/recon.json",
      ]),
    ).toEqual({
      batchPath: "docs/proof-led-outreach-batch-02.csv",
      tier: "overflow",
      limit: 5,
      timeoutMs: 7000,
      concurrency: 2,
      jsonOutputPath: "private/recon.json",
    });
  });
});
