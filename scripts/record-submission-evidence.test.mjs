import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { trackedFieldNoteUrl, trackedFileCheckUrl, trackedPilotProofUrl, trackedProofUrl } from "./outreach-tracking.mjs";
import { parseOutreachResults } from "./summarize-outreach-results.mjs";
import {
  parseSubmissionEvidenceArgs,
  recordSubmissionEvidence,
} from "./record-submission-evidence.mjs";

const RESULT_HEADER =
  "route_id,date_sent,company_or_channel,tier,proof_url,field_note_url,file_check_url,pilot_proof_url,status,response_type,field_note_click_count,file_check_count,paid_order_count,pilot_requested,reply_notes,next_action";

function fixtureCsv(routeId = "b02-r03") {
  return [
    RESULT_HEADER,
    [
      routeId,
      "",
      "Control Union",
      "overflow",
      trackedProofUrl(routeId),
      trackedFieldNoteUrl(routeId),
      trackedFileCheckUrl(routeId),
      trackedPilotProofUrl(routeId),
      "not_sent",
      "none",
      "0",
      "0",
      "0",
      "no",
      "",
      "send first message",
    ].join(","),
    "",
  ].join("\n");
}

describe("submission evidence recorder", () => {
  it("parses a guarded submission-evidence command", () => {
    expect(
      parseSubmissionEvidenceArgs([
        "--results",
        "private/outreach-results-batch-02.csv",
        "--route",
        "b02-r03",
        "--submitted-at",
        "2026-06-17T18:30:00.000Z",
        "--success-url",
        "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
        "--success-text",
        "Thank you for your message",
        "--output",
        "private/submission-evidence-b02-r03.json",
        "--confirm-visible-success",
      ]),
    ).toMatchObject({
      resultsPath: "private/outreach-results-batch-02.csv",
      routeId: "b02-r03",
      submittedAt: "2026-06-17T18:30:00.000Z",
      successUrl: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
      successText: "Thank you for your message",
      outputPath: "private/submission-evidence-b02-r03.json",
      confirmedVisibleSuccess: true,
    });
  });

  it("refuses to record a submission without visible-success confirmation", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-submit-evidence-"));
    const resultsPath = path.join(tempDir, "results.csv");

    await fs.writeFile(resultsPath, fixtureCsv(), "utf8");

    await expect(
      recordSubmissionEvidence({
        resultsPath,
        routeId: "b02-r03",
        submittedAt: "2026-06-17T18:30:00.000Z",
        successUrl: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
        successText: "Thank you for your message",
        outputPath: path.join(tempDir, "evidence.json"),
        confirmedVisibleSuccess: false,
      }),
    ).rejects.toThrow("visible success confirmation is required");
  });

  it("writes a private evidence receipt and updates the results ledger", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-submit-evidence-"));
    const resultsPath = path.join(tempDir, "results.csv");
    const outputPath = path.join(tempDir, "submission-evidence-b02-r03.json");

    await fs.writeFile(resultsPath, fixtureCsv(), "utf8");

    const result = await recordSubmissionEvidence({
      resultsPath,
      routeId: "b02-r03",
      submittedAt: "2026-06-17T18:30:00.000Z",
      successUrl: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
      successText: "Thank you for your message",
      outputPath,
      confirmedVisibleSuccess: true,
    });

    const evidence = JSON.parse(await fs.readFile(outputPath, "utf8"));
    const rows = parseOutreachResults(await fs.readFile(resultsPath, "utf8"));

    expect(result).toMatchObject({
      routeId: "b02-r03",
      resultsPath,
      outputPath,
    });
    expect(evidence).toMatchObject({
      routeId: "b02-r03",
      companyOrChannel: "Control Union",
      submittedAt: "2026-06-17T18:30:00.000Z",
      successUrl: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
      visibleSuccessObserved: true,
      successText: "Thank you for your message",
    });
    expect(rows[0]).toMatchObject({
      route_id: "b02-r03",
      date_sent: "2026-06-17",
      status: "sent",
      response_type: "none",
      reply_notes:
        "public form submitted; visible form success observed; submission evidence: submission-evidence-b02-r03.json",
      next_action: "watch for reply; follow up after 4 business days if no response",
    });
  });

  it("rejects success text that includes private contact data", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "traceready-submit-evidence-"));
    const resultsPath = path.join(tempDir, "results.csv");

    await fs.writeFile(resultsPath, fixtureCsv(), "utf8");

    await expect(
      recordSubmissionEvidence({
        resultsPath,
        routeId: "b02-r03",
        submittedAt: "2026-06-17T18:30:00.000Z",
        successUrl: "https://www.controlunion.com/eu-deforestation-regulation-eudr/",
        successText: "Thanks, alice@example.com",
        outputPath: path.join(tempDir, "evidence.json"),
        confirmedVisibleSuccess: true,
      }),
    ).rejects.toThrow("successText must not contain email addresses");
  });

  it("is wired as an npm script for action-time submission receipts", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    expect(packageJson.scripts["record:submission-evidence"]).toBe(
      "node scripts/record-submission-evidence.mjs",
    );
  });
});
