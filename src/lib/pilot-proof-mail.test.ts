import { describe, expect, it } from "vitest";
import { buildPilotProofMailBody, buildPilotProofMailto } from "./pilot-proof-mail";

describe("pilot proof mail helpers", () => {
  it("builds a documented pilot request without asking for raw coordinates", () => {
    const body = buildPilotProofMailBody();

    expect(body).toContain("TraceReady documented pilot request");
    expect(body).toContain("Do not include raw coordinates or confidential supplier data");
    expect(body).toContain("anonymized TraceReady case study");
    expect(body).toContain("You may publish anonymized issue counts: yes/no");
    expect(body).toContain("You may quote one sentence from us without naming the company: yes/no");
    expect(body).toContain("You may publish only with explicit yes:");
    expect(body).toContain("What stays private even if the pilot is useful:");
    expect(body).toContain("company name, supplier names, buyer names, coordinates, source rows");
    expect(body).toContain("If permission is no, treat the cleanup as private work only: yes/no");
  });

  it("stamps outreach attribution into documented pilot mailto links", () => {
    const href = buildPilotProofMailto(
      "?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r11",
    );
    const decoded = decodeURIComponent(href);

    expect(href).toContain("mailto:founder@traceready.online");
    expect(href).toContain("TraceReady%20documented%20pilot%20request");
    expect(decoded).toContain("Outreach route: b01-r11");
    expect(decoded).toContain("Outreach source: proof_led_batch_01");
    expect(decoded).toContain("Outreach campaign: eudr_file_readiness");
  });
});
