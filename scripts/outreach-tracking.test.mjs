import { describe, expect, it } from "vitest";
import { trackedPilotProofUrl } from "./outreach-tracking.mjs";

describe("outreach tracking URLs", () => {
  it("builds route-stamped documented pilot proof URLs", () => {
    expect(trackedPilotProofUrl("b01-r06")).toBe(
      "https://traceready.online/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );
  });
});
