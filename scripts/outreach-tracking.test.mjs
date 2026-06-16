import { describe, expect, it } from "vitest";
import { trackedPilotProofUrl, trackedProofUrl } from "./outreach-tracking.mjs";

describe("outreach tracking URLs", () => {
  it("builds route-stamped public pilot case proof URLs", () => {
    expect(trackedProofUrl("b01-r06")).toBe(
      "https://traceready.online/proof/public-cocoa-pilot/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );
  });

  it("builds route-stamped documented pilot proof URLs", () => {
    expect(trackedPilotProofUrl("b01-r06")).toBe(
      "https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );
  });
});
