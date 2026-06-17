import { describe, expect, it } from "vitest";
import {
  inspectLiveSubmitRoutes,
  parseSubmitQueueRoutes,
  parseSubmitRouteLiveArgs,
  renderLiveSubmitRouteReport,
} from "./verify-outreach-submit-live.mjs";

const QUEUE_MARKDOWN = `# TraceReady submit queue - 2026-06-16

OUTREACH_SUBMIT_QUEUE=pass ready_routes=2 preflight_ready=2 reply_capture=at_risk

| Route | Target | Public route | Send-ready packet | Submit preflight | Reply capture |
| --- | --- | --- | --- | --- | --- |
| \`b02-r03\` | Control Union | https://www.controlunion.com/eu-deforestation-regulation-eudr/ | \`private/send-ready-b02-r03.md\` | \`private/preflight-submit-b02-r03.md\` | \`at_risk\` |
| \`b02-r04\` | Bureau Veritas | https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv | \`private/send-ready-b02-r04.md\` | \`private/preflight-submit-b02-r04.md\` | \`at_risk\` |
`;

const SENDABILITY_AUDIT = {
  auditDate: "2026-06-16",
  routes: [
    {
      route_id: "b02-r03",
      company_or_channel: "Control Union",
      sendability: "browser_form_ready",
      contact_method: "public_browser_form",
      route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
      requires_action_time_confirmation: true,
    },
    {
      route_id: "b02-r04",
      company_or_channel: "Bureau Veritas",
      sendability: "browser_form_ready",
      contact_method: "public_browser_form",
      route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
      requires_action_time_confirmation: true,
    },
  ],
};

describe("live submit route verifier", () => {
  it("parses the private submit queue route table", () => {
    expect(parseSubmitQueueRoutes(QUEUE_MARKDOWN)).toEqual([
      {
        route_id: "b02-r03",
        company_or_channel: "Control Union",
        route_url: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
        send_ready_path: "private/send-ready-b02-r03.md",
        preflight_path: "private/preflight-submit-b02-r03.md",
        reply_capture: "at_risk",
      },
      {
        route_id: "b02-r04",
        company_or_channel: "Bureau Veritas",
        route_url: "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
        send_ready_path: "private/send-ready-b02-r04.md",
        preflight_path: "private/preflight-submit-b02-r04.md",
        reply_capture: "at_risk",
      },
    ]);
  });

  it("passes when queued ready routes are still reachable without CAPTCHA markers", async () => {
    const report = await inspectLiveSubmitRoutes({
      queueMarkdown: QUEUE_MARKDOWN,
      sendabilityAudit: SENDABILITY_AUDIT,
      fetchImpl: async (url) => ({
        ok: true,
        status: 200,
        url,
        text: async () => "<html><form><input name='email'></form></html>",
      }),
    });
    const markdown = renderLiveSubmitRouteReport(report, { generatedAt: "2026-06-16" });

    expect(report.readyRoutes).toBe(2);
    expect(report.liveReadyRoutes).toBe(2);
    expect(report.blockedRoutes).toEqual([]);
    expect(report.captchaRoutes).toEqual([]);
    expect(markdown).toContain("OUTREACH_SUBMIT_LIVE=pass ready_routes=2 live_ready=2 blocked=0 captcha=0");
    expect(markdown).toContain("| `b02-r03` | Control Union | `200` | pass |");
    expect(markdown).toContain("| `b02-r04` | Bureau Veritas | `200` | pass |");
  });

  it("flags stale queue rows, blocked fetches, and CAPTCHA markers", async () => {
    const report = await inspectLiveSubmitRoutes({
      queueMarkdown: QUEUE_MARKDOWN.replace(
        "https://news.bureauveritas.net/l/591681/2024-10-25/3t89vtv",
        "https://example.test/stale-bv-form",
      ),
      sendabilityAudit: SENDABILITY_AUDIT,
      fetchImpl: async (url) => {
        if (url.includes("controlunion")) {
          return {
            ok: false,
            status: 403,
            url,
            text: async () => "Forbidden",
          };
        }

        return {
          ok: true,
          status: 200,
          url,
          text: async () => "<html><div class='g-recaptcha'></div></html>",
        };
      },
    });

    expect(report.liveReadyRoutes).toBe(0);
    expect(report.staleQueueRoutes).toEqual(["b02-r04"]);
    expect(report.blockedRoutes).toEqual(["b02-r03"]);
    expect(report.captchaRoutes).toEqual(["b02-r04"]);
    expect(report.status).toBe("pending");
  });

  it("parses CLI flags for the live route verifier", () => {
    expect(
      parseSubmitRouteLiveArgs([
        "--queue",
        "private/preflight-submit-queue.md",
        "--sendability-audit",
        "private/outreach-sendability-audit-batch-02.json",
        "--output",
        "private/submit-route-live-check.md",
        "--today",
        "2026-06-16",
      ]),
    ).toEqual({
      queuePath: "private/preflight-submit-queue.md",
      sendabilityAuditPath: "private/outreach-sendability-audit-batch-02.json",
      outputPath: "private/submit-route-live-check.md",
      generatedAt: "2026-06-16",
      timeoutMs: 12000,
    });
  });
});
