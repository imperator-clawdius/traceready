import { describe, expect, it } from "vitest";
import { buildTriageMailBody, buildTriageMailto } from "./triage-mail";

describe("triage mail helpers", () => {
  it("builds a non-sensitive issue-log triage body without route attribution by default", () => {
    const body = buildTriageMailBody();

    expect(body).toContain("Do not include raw coordinates or confidential supplier data");
    expect(body).toContain("Issue counts from TraceReady");
    expect(body).toContain("Non-sensitive field names or sample row shape");
    expect(body).not.toContain("Outreach route:");
  });

  it("stamps outreach attribution into routed triage mailto links", () => {
    const mailto = buildTriageMailto(
      "?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );

    expect(mailto).toContain("mailto:founder@traceready.online");
    expect(mailto).toContain("TraceReady%20free%20issue-log%20triage");
    expect(decodeURIComponent(mailto)).toContain("Outreach route: b01-r04");
    expect(decodeURIComponent(mailto)).toContain("Outreach source: proof_led_batch_01");
    expect(decodeURIComponent(mailto)).toContain("Outreach campaign: eudr_file_readiness");
  });
});
