import { describe, expect, it } from "vitest";
import {
  appendOutreachSearch,
  formatOutreachAttributionLines,
  parseOutreachAttribution,
} from "./outreach-attribution";

describe("outreach attribution helpers", () => {
  it("parses proof-led UTM route attribution from a query string", () => {
    expect(
      parseOutreachAttribution(
        "?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
      ),
    ).toEqual({
      routeId: "b01-r06",
      source: "proof_led_batch_01",
      medium: "outreach",
      campaign: "eudr_file_readiness",
    });
  });

  it("rejects invalid or missing route IDs", () => {
    expect(parseOutreachAttribution("?utm_content=alice@example.com")).toBeNull();
    expect(parseOutreachAttribution("?utm_content=https://www.linkedin.com/in/example")).toBeNull();
    expect(parseOutreachAttribution("?utm_source=proof_led_batch_01")).toBeNull();
  });

  it("preserves only allowed outreach search params on internal links", () => {
    expect(
      appendOutreachSearch(
        "/",
        "?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04&email=alice@example.com",
      ),
    ).toBe(
      "/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );
  });

  it("renders plain text attribution lines for handoff artifacts", () => {
    expect(
      formatOutreachAttributionLines({
        routeId: "b01-r06",
        source: "proof_led_batch_01",
        campaign: "eudr_file_readiness",
      }),
    ).toEqual(["Outreach route: b01-r06", "Outreach source: proof_led_batch_01", "Outreach campaign: eudr_file_readiness"]);
  });
});
