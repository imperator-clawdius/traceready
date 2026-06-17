import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectOutreachEmailDns } from "./verify-outreach-email.mjs";
import { parseOutreachResults, summarizeOutreachResults, validateOutreachResults } from "./summarize-outreach-results.mjs";
import { parseOutreachLedger, validateOutreachLedger } from "./verify-outreach-ledger.mjs";
import { validateOutreachSendabilityAudit } from "./verify-outreach-sendability.mjs";

const DEFAULT_PUBLIC_AUDIT_PATH = "docs/public-dataset-mini-audit.md";
const DEFAULT_BATCH_PATH = "docs/proof-led-outreach-batch-02.csv";
const DEFAULT_RESULTS_PATH = "private/outreach-results-batch-02.csv";
const DEFAULT_SENDABILITY_AUDIT_PATH = "private/outreach-sendability-audit-batch-02.json";
const DEFAULT_CONTACT_RECON_PATH = "private/outreach-contact-recon-batch-02.json";
const DEFAULT_LIVE_SUBMIT_REPORT_PATH = "private/submit-route-live-check.md";
const SEND_PACKET_TRUST_BRIDGE_MARKER = "Trust bridge: TraceReady is a spreadsheet bouncer";

export function scoreTractionReadiness({
  publicAuditMarkdown,
  batchRows,
  resultRows,
  sendabilityAudit,
  contactRecon,
  emailReport,
  sendReadyPackets,
  submitPreflightPackets,
  liveSubmitReport,
}) {
  const publicProof = parsePublicProof(publicAuditMarkdown);
  const resultsSummary = summarizeOutreachResults(resultRows);
  const sendabilityRoutes = Array.isArray(sendabilityAudit?.routes) ? sendabilityAudit.routes : [];
  const readyRoutes = sendabilityRoutes.filter((route) => route.sendability === "browser_form_ready");
  const blockedRoutes = sendabilityRoutes.filter((route) => route.sendability === "blocked");
  const readyRouteSummaries = readyRoutes.map((route) => ({
    route_id: route.route_id,
    company_or_channel: route.company_or_channel ?? batchRows.find((row) => row.route_id === route.route_id)?.company_or_channel ?? route.route_id,
    route_url: route.route_url,
  }));
  const packetVerification = verifySendReadyPackets(readyRouteSummaries, sendReadyPackets);
  const submitPreflightVerification = verifySubmitPreflightPackets(readyRouteSummaries, submitPreflightPackets);
  const liveSubmitVerification = parseLiveSubmitReport(liveSubmitReport);
  const submissionEvidence = verifySubmissionEvidence(resultRows);
  const reconSummary = contactRecon?.summary ?? {};
  const emailChecks = Object.fromEntries((emailReport?.checks ?? []).map((check) => [check.label, check.ready]));
  const replyCaptureReady = Boolean(emailChecks.OUTREACH_EMAIL_MX && emailChecks.OUTREACH_EMAIL_ALIAS_TEST);
  const liveSubmitReadyButReplyCaptureAtRisk =
    liveSubmitVerification.checked &&
    liveSubmitVerification.status === "pass" &&
    submitPreflightVerification.checked &&
    resultsSummary.sentOrBeyond === 0 &&
    readyRoutes.length > 0 &&
    !replyCaptureReady;
  const currentState =
    packetVerification.checked &&
    packetVerification.missingPacketRoutes.length +
      packetVerification.missingConfirmationRoutes.length +
      packetVerification.missingTrustBridgeRoutes.length >
      0
      ? "proof_ready_routes_need_send_packets"
      : submitPreflightVerification.checked &&
          submitPreflightVerification.missingPreflightRoutes.length +
            submitPreflightVerification.missingConfirmationRoutes.length >
            0
        ? "proof_ready_routes_need_submit_preflights"
        : liveSubmitVerification.checked && liveSubmitVerification.status !== "pass"
          ? "proof_ready_live_submit_routes_blocked"
          : liveSubmitReadyButReplyCaptureAtRisk
            ? "proof_ready_reply_capture_at_risk_traction_unmeasured"
        : liveSubmitVerification.checked && submitPreflightVerification.checked && resultsSummary.sentOrBeyond === 0 && readyRoutes.length > 0
          ? "proof_ready_live_submit_ready_traction_unmeasured"
        : submitPreflightVerification.checked && resultsSummary.sentOrBeyond === 0 && readyRoutes.length > 0
          ? "proof_ready_submit_preflight_ready_traction_unmeasured"
      : resultsSummary.sentOrBeyond === 0 && readyRoutes.length > 0
      ? "proof_ready_send_ready_traction_unmeasured"
      : submissionEvidence.unevidencedSentRoutes.length > 0
        ? "outreach_sent_needs_submission_evidence"
      : resultsSummary.sentOrBeyond > 0 && resultsSummary.replies + resultsSummary.fileChecks + resultsSummary.paidOrders + resultsSummary.pilotRequests === 0
        ? "outreach_sent_waiting_for_signal"
        : "traction_signal_present";

  return {
    publicProof,
    outreach: {
      batchRoutes: batchRows.length,
      routesInspected: Number(reconSummary.routesInspected ?? 0),
      candidateBrowserFormRoutes: Number(reconSummary.candidateBrowserForm ?? 0),
      formWithCaptchaRoutes: Number(reconSummary.formWithCaptcha ?? 0),
      contactLinkOnlyRoutes: Number(reconSummary.contactLinkOnly ?? 0),
      unreachableRoutes: Number(reconSummary.unreachable ?? 0),
      sendabilityAuditRoutes: sendabilityRoutes.length,
      readyBrowserFormRoutes: readyRoutes.length,
      blockedSendabilityRoutes: blockedRoutes.length,
      readyRoutes: readyRouteSummaries,
      packetReadyRoutes: packetVerification.packetReadyRoutes,
      missingPacketRoutes: packetVerification.missingPacketRoutes,
      missingConfirmationRoutes: packetVerification.missingConfirmationRoutes,
      missingPacketTrustBridgeRoutes: packetVerification.missingTrustBridgeRoutes,
      submitPreflightReadyRoutes: submitPreflightVerification.preflightReadyRoutes,
      missingSubmitPreflightRoutes: submitPreflightVerification.missingPreflightRoutes,
      missingSubmitPreflightConfirmationRoutes: submitPreflightVerification.missingConfirmationRoutes,
      liveSubmitStatus: liveSubmitVerification.checked ? liveSubmitVerification.status : "not checked",
      liveSubmitReadyRoutes: liveSubmitVerification.liveReadyRoutes,
      liveSubmitBlockedRoutes: liveSubmitVerification.blockedRoutes,
      liveSubmitCaptchaRoutes: liveSubmitVerification.captchaRoutes,
      liveSubmitMissingQueueRoutes: liveSubmitVerification.missingQueueRoutes,
      liveSubmitStaleQueueRoutes: liveSubmitVerification.staleQueueRoutes,
      liveSubmitFetchErrorRoutes: liveSubmitVerification.fetchErrorRoutes,
      liveSubmitHttpBlockedRouteIds: liveSubmitVerification.httpBlockedRouteIds,
      liveSubmitCaptchaRouteIds: liveSubmitVerification.captchaRouteIds,
      sentOrBeyond: resultsSummary.sentOrBeyond,
      evidenceBackedSubmissions: submissionEvidence.evidenceBackedSubmissions,
      unevidencedSentRoutes: submissionEvidence.unevidencedSentRoutes,
      replies: resultsSummary.replies,
      fieldNoteClicks: resultsSummary.fieldNoteClicks,
      fileChecks: resultsSummary.fileChecks,
      paidOrders: resultsSummary.paidOrders,
      pilotRequests: resultsSummary.pilotRequests,
    },
    email: {
      ready: Boolean(emailReport?.ready),
      dnsReady: Boolean(emailReport?.dnsReady),
      replyCaptureReady,
      checks: emailChecks,
    },
    currentState,
    nextGate:
      packetVerification.checked &&
      packetVerification.missingPacketRoutes.length +
        packetVerification.missingConfirmationRoutes.length +
        packetVerification.missingTrustBridgeRoutes.length >
        0
        ? "render_missing_send_ready_packets"
        : submitPreflightVerification.checked &&
            submitPreflightVerification.missingPreflightRoutes.length +
              submitPreflightVerification.missingConfirmationRoutes.length >
              0
          ? "render_missing_submit_preflights"
          : liveSubmitVerification.checked && liveSubmitVerification.status !== "pass"
            ? "refresh_or_replace_blocked_submit_routes"
            : liveSubmitReadyButReplyCaptureAtRisk
              ? "verify_reply_capture_before_external_submission"
        : submissionEvidence.unevidencedSentRoutes.length > 0
          ? "record_visible_success_evidence_before_measuring_traction"
        : resultsSummary.sentOrBeyond === 0 && readyRoutes.length > 0
        ? "submit_verified_public_forms_after_action_time_confirmation"
        : "measure_replies_file_checks_pilot_requests_and_paid_orders",
  };
}

export function renderTractionReadinessScorecard(score, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString().slice(0, 10);
  const readyRouteLines = score.outreach.readyRoutes.length
    ? score.outreach.readyRoutes.map((route) => {
        const packetPath = `private/send-ready-${route.route_id}.md`;
        return `| \`${route.route_id}\` | ${route.company_or_channel} | \`${route.route_url}\` | \`${packetPath}\` |`;
      })
    : ["| none | none | none | none |"];
  const confirmationLines = score.outreach.readyRoutes.map(
    (route) =>
      `Confirm: submit ${route.route_id} to ${route.company_or_channel} using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-${route.route_id}.md.`,
  );

  return `# TraceReady traction-readiness scorecard - ${generatedAt}

## Headline

Current state: \`${score.currentState}\`

Next gate: \`${score.nextGate}\`

## Public Problem Proof

| Proof metric | Current evidence |
| --- | ---: |
| Public rows analyzed | ${formatNumber(score.publicProof.recordsAnalyzed)} |
| Rows with latitude/longitude | ${formatNumber(score.publicProof.recordsWithCoordinates)} |
| Point-only plots over 4 hectares | ${formatNumber(score.publicProof.pointOnlyOver4ha)} |
| Rows without plot IDs | ${formatNumber(score.publicProof.missingPlotIds)} |
| Rows without supplier identity | ${formatNumber(score.publicProof.missingSupplierIdentity)} |
| Polygon records present | ${formatNumber(score.publicProof.polygonRecordsPresent)} |
| Ready records | ${formatNumber(score.publicProof.readyRecords)} |
| Readiness score | ${score.publicProof.readinessScore || "unknown"} |

## Outreach Funnel State

| Funnel step | Count |
| --- | ---: |
| Batch routes | ${score.outreach.batchRoutes} |
| Routes inspected by contact recon | ${score.outreach.routesInspected} |
| Candidate browser-form routes from recon | ${score.outreach.candidateBrowserFormRoutes} |
| Form-with-CAPTCHA routes from recon | ${score.outreach.formWithCaptchaRoutes} |
| Contact-link-only routes from recon | ${score.outreach.contactLinkOnlyRoutes} |
| Unreachable routes from recon | ${score.outreach.unreachableRoutes} |
| Manually verified browser-form-ready routes | ${score.outreach.readyBrowserFormRoutes} |
| Send-ready packets with matching confirmation | ${score.outreach.packetReadyRoutes ?? "not checked"} |
| Missing send-ready packets | ${(score.outreach.missingPacketRoutes ?? []).length} |
| Send-ready packets missing confirmation | ${(score.outreach.missingConfirmationRoutes ?? []).length} |
| Submit preflights with matching confirmation | ${score.outreach.submitPreflightReadyRoutes ?? "not checked"} |
| Missing submit preflights | ${(score.outreach.missingSubmitPreflightRoutes ?? []).length} |
| Submit preflights missing confirmation | ${(score.outreach.missingSubmitPreflightConfirmationRoutes ?? []).length} |
| Live submit routes checked | ${score.outreach.liveSubmitStatus ?? "not checked"} |
| Live submit routes ready | ${score.outreach.liveSubmitReadyRoutes ?? "not checked"} |
| Live submit routes HTTP-blocked | ${score.outreach.liveSubmitBlockedRoutes ?? "not checked"} |
| Live submit routes CAPTCHA/challenge | ${score.outreach.liveSubmitCaptchaRoutes ?? "not checked"} |
| Blocked sendability routes | ${score.outreach.blockedSendabilityRoutes} |
| External submissions completed | ${score.outreach.sentOrBeyond} |
| Evidence-backed submissions | ${score.outreach.evidenceBackedSubmissions} |
| Sent rows missing submission evidence | ${(score.outreach.unevidencedSentRoutes ?? []).length} |
| Replies | ${score.outreach.replies} |
| Field-note clicks | ${score.outreach.fieldNoteClicks} |
| Browser/file checks | ${score.outreach.fileChecks} |
| Paid cleanup orders | ${score.outreach.paidOrders} |
| Pilot requests | ${score.outreach.pilotRequests} |

## Ready Send Block

| Route | Target | Public route | Packet |
| --- | --- | --- | --- |
${readyRouteLines.join("\n")}

## Send Packet Guard

| Check | Route IDs |
| --- | --- |
| Missing packet files | ${(score.outreach.missingPacketRoutes ?? []).length ? score.outreach.missingPacketRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| Missing confirmation text | ${(score.outreach.missingConfirmationRoutes ?? []).length ? score.outreach.missingConfirmationRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| Send-ready packets missing trust bridge | ${(score.outreach.missingPacketTrustBridgeRoutes ?? []).length ? score.outreach.missingPacketTrustBridgeRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |

## Submit Preflight Guard

| Check | Route IDs |
| --- | --- |
| Missing submit preflight files | ${(score.outreach.missingSubmitPreflightRoutes ?? []).length ? score.outreach.missingSubmitPreflightRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| Submit preflights missing confirmation | ${(score.outreach.missingSubmitPreflightConfirmationRoutes ?? []).length ? score.outreach.missingSubmitPreflightConfirmationRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |

## Live Submit Route Guard

| Check | Route IDs |
| --- | --- |
| Missing from submit queue | ${(score.outreach.liveSubmitMissingQueueRoutes ?? []).length ? score.outreach.liveSubmitMissingQueueRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| Queue URL differs from sendability audit | ${(score.outreach.liveSubmitStaleQueueRoutes ?? []).length ? score.outreach.liveSubmitStaleQueueRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| Fetch errors | ${(score.outreach.liveSubmitFetchErrorRoutes ?? []).length ? score.outreach.liveSubmitFetchErrorRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| HTTP blocked | ${(score.outreach.liveSubmitHttpBlockedRouteIds ?? []).length ? score.outreach.liveSubmitHttpBlockedRouteIds.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |
| CAPTCHA or browser challenge marker | ${(score.outreach.liveSubmitCaptchaRouteIds ?? []).length ? score.outreach.liveSubmitCaptchaRouteIds.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |

## Submission Evidence Guard

| Check | Route IDs |
| --- | --- |
| Sent rows missing visible-success or response evidence | ${(score.outreach.unevidencedSentRoutes ?? []).length ? score.outreach.unevidencedSentRoutes.map((routeId) => `\`${routeId}\``).join(", ") : "none"} |

## Reply-Capture Risk

| Email check | Status |
| --- | --- |
| OUTREACH_EMAIL_MX | ${statusFor(score.email.checks.OUTREACH_EMAIL_MX)} |
| OUTREACH_EMAIL_DMARC | ${statusFor(score.email.checks.OUTREACH_EMAIL_DMARC)} |
| OUTREACH_EMAIL_DKIM | ${statusFor(score.email.checks.OUTREACH_EMAIL_DKIM)} |
| OUTREACH_EMAIL_OUTBOUND_AUTH | ${statusFor(score.email.checks.OUTREACH_EMAIL_OUTBOUND_AUTH)} |
| OUTREACH_EMAIL_ALIAS_TEST | ${statusFor(score.email.checks.OUTREACH_EMAIL_ALIAS_TEST)} |
| OUTREACH_EMAIL_REPLY_CAPTURE | ${statusFor(score.email.replyCaptureReady)} |
| OUTREACH_EMAIL_READY | ${statusFor(score.email.ready)} |

Email gate summary:

- OUTREACH_EMAIL_MX: ${statusFor(score.email.checks.OUTREACH_EMAIL_MX)}
- OUTREACH_EMAIL_DMARC: ${statusFor(score.email.checks.OUTREACH_EMAIL_DMARC)}
- OUTREACH_EMAIL_DKIM: ${statusFor(score.email.checks.OUTREACH_EMAIL_DKIM)}
- OUTREACH_EMAIL_OUTBOUND_AUTH: ${statusFor(score.email.checks.OUTREACH_EMAIL_OUTBOUND_AUTH)}
- OUTREACH_EMAIL_ALIAS_TEST: ${statusFor(score.email.checks.OUTREACH_EMAIL_ALIAS_TEST)}
- OUTREACH_EMAIL_REPLY_CAPTURE: ${statusFor(score.email.replyCaptureReady)}
- OUTREACH_EMAIL_READY: ${statusFor(score.email.ready)}

${score.email.replyCaptureReady ? "" : "Reply capture must pass before treating non-response as market evidence.\n"}

## Measurement Rule

Count only replies, routed browser/file checks, concrete referrals, pilot requests, paid cleanup orders, or permissioned de-identified before/after evidence as traction.

Do not count prepared routes, submitted messages, likes, compliments, or vague interest as traction.

## Action-Time Confirmations

External form submission still requires explicit user confirmation at action time.

\`\`\`text
${confirmationLines.join("\n")}
\`\`\`
`;
}

export function parseTractionReadinessArgs(argv) {
  const options = {
    publicAuditPath: DEFAULT_PUBLIC_AUDIT_PATH,
    batchPath: DEFAULT_BATCH_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    sendabilityAuditPath: DEFAULT_SENDABILITY_AUDIT_PATH,
    contactReconPath: DEFAULT_CONTACT_RECON_PATH,
    liveSubmitReportPath: DEFAULT_LIVE_SUBMIT_REPORT_PATH,
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }

    if (flag === "--skip-email") {
      options.skipEmail = true;
      continue;
    }

    if (flag === "--alias-tested") {
      options.aliasTested = true;
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--public-audit") {
      options.publicAuditPath = value;
    } else if (flag === "--batch") {
      options.batchPath = value;
    } else if (flag === "--results") {
      options.resultsPath = value;
    } else if (flag === "--sendability-audit") {
      options.sendabilityAuditPath = value;
    } else if (flag === "--contact-recon") {
      options.contactReconPath = value;
    } else if (flag === "--live-submit-report") {
      options.liveSubmitReportPath = value;
    } else if (flag === "--output") {
      options.outputPath = value;
    } else if (flag === "--today") {
      options.generatedAt = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  return options;
}

export async function loadSendReadyPackets(readyRoutes) {
  const entries = await Promise.all(
    readyRoutes.map(async (route) => {
      const packetPath = `private/send-ready-${route.route_id}.md`;

      try {
        return [route.route_id, await fs.readFile(packetPath, "utf8")];
      } catch {
        return [route.route_id, ""];
      }
    }),
  );

  return Object.fromEntries(entries);
}

export async function loadSubmitPreflightPackets(readyRoutes) {
  const entries = await Promise.all(
    readyRoutes.map(async (route) => {
      const packetPath = `private/preflight-submit-${route.route_id}.md`;

      try {
        return [route.route_id, await fs.readFile(packetPath, "utf8")];
      } catch {
        return [route.route_id, ""];
      }
    }),
  );

  return Object.fromEntries(entries);
}

export async function loadLiveSubmitReport(reportPath = DEFAULT_LIVE_SUBMIT_REPORT_PATH) {
  try {
    return await fs.readFile(reportPath, "utf8");
  } catch {
    return "";
  }
}

function parsePublicProof(markdown) {
  return {
    recordsAnalyzed: extractNumber(markdown, "Records analyzed"),
    recordsWithCoordinates: extractNumber(markdown, "Records with latitude/longitude"),
    pointOnlyOver4ha: extractNumber(markdown, "Point-only plots over 4 hectares"),
    missingPlotIds: extractNumber(markdown, "missing_farmId"),
    missingSupplierIdentity: extractNumber(markdown, "missing_supplier"),
    polygonRecordsPresent: extractNumber(markdown, "Polygon records present"),
    readyRecords: extractNumber(markdown, "Ready records"),
    readinessScore: extractText(markdown, "Readiness score"),
  };
}

function verifySendReadyPackets(readyRoutes, sendReadyPackets) {
  if (sendReadyPackets === undefined) {
    return {
      checked: false,
      packetReadyRoutes: undefined,
      missingPacketRoutes: [],
      missingConfirmationRoutes: [],
      missingTrustBridgeRoutes: [],
    };
  }

  const missingPacketRoutes = [];
  const missingConfirmationRoutes = [];
  const missingTrustBridgeRoutes = [];

  for (const route of readyRoutes) {
    const packetText = sendReadyPackets[route.route_id] ?? sendReadyPackets[`private/send-ready-${route.route_id}.md`] ?? "";
    const expectedConfirmation = `Confirm: submit ${route.route_id} to ${route.company_or_channel} using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-${route.route_id}.md.`;

    if (!packetText.trim()) {
      missingPacketRoutes.push(route.route_id);
    } else if (!packetText.includes(expectedConfirmation)) {
      missingConfirmationRoutes.push(route.route_id);
    } else if (!packetText.includes(SEND_PACKET_TRUST_BRIDGE_MARKER)) {
      missingTrustBridgeRoutes.push(route.route_id);
    }
  }
  const notReadyRouteCount = new Set([
    ...missingPacketRoutes,
    ...missingConfirmationRoutes,
    ...missingTrustBridgeRoutes,
  ]).size;

  return {
    checked: true,
    packetReadyRoutes: readyRoutes.length - notReadyRouteCount,
    missingPacketRoutes,
    missingConfirmationRoutes,
    missingTrustBridgeRoutes,
  };
}

function verifySubmitPreflightPackets(readyRoutes, submitPreflightPackets) {
  if (submitPreflightPackets === undefined) {
    return {
      checked: false,
      preflightReadyRoutes: undefined,
      missingPreflightRoutes: [],
      missingConfirmationRoutes: [],
    };
  }

  const missingPreflightRoutes = [];
  const missingConfirmationRoutes = [];

  for (const route of readyRoutes) {
    const packetText =
      submitPreflightPackets[route.route_id] ??
      submitPreflightPackets[`private/preflight-submit-${route.route_id}.md`] ??
      "";
    const expectedPassLine = `OUTREACH_SUBMIT_PREFLIGHT=pass route=${route.route_id} company="${route.company_or_channel}"`;
    const expectedConfirmation = `Confirm: submit ${route.route_id} to ${route.company_or_channel} using TraceReady Desk, founder@traceready.online, Passive Print Labs LLC / TraceReady, and the message in private/send-ready-${route.route_id}.md.`;

    if (!packetText.trim()) {
      missingPreflightRoutes.push(route.route_id);
    } else if (!packetText.includes(expectedPassLine) || !packetText.includes(expectedConfirmation)) {
      missingConfirmationRoutes.push(route.route_id);
    }
  }

  return {
    checked: true,
    preflightReadyRoutes: readyRoutes.length - missingPreflightRoutes.length - missingConfirmationRoutes.length,
    missingPreflightRoutes,
    missingConfirmationRoutes,
  };
}

function parseLiveSubmitReport(markdown) {
  const text = String(markdown ?? "");
  const summary = text.match(
    /OUTREACH_SUBMIT_LIVE=(\w+)\s+ready_routes=(\d+)\s+live_ready=(\d+)\s+blocked=(\d+)\s+captcha=(\d+)/,
  );

  if (!summary) {
    return {
      checked: false,
      status: "not checked",
      liveReadyRoutes: undefined,
      blockedRoutes: undefined,
      captchaRoutes: undefined,
      missingQueueRoutes: [],
      staleQueueRoutes: [],
      fetchErrorRoutes: [],
      httpBlockedRouteIds: [],
      captchaRouteIds: [],
    };
  }

  return {
    checked: true,
    status: summary[1],
    readyRoutes: Number(summary[2]),
    liveReadyRoutes: Number(summary[3]),
    blockedRoutes: Number(summary[4]),
    captchaRoutes: Number(summary[5]),
    missingQueueRoutes: extractRouteSet(text, "Missing from submit queue"),
    staleQueueRoutes: extractRouteSet(text, "Queue URL differs from sendability audit"),
    fetchErrorRoutes: extractRouteSet(text, "Fetch errors"),
    httpBlockedRouteIds: extractRouteSet(text, "HTTP blocked"),
    captchaRouteIds: extractRouteSet(text, "CAPTCHA or browser challenge marker"),
  };
}

function verifySubmissionEvidence(resultRows) {
  const sentRows = resultRows.filter((row) => row.status !== "not_sent");
  const evidenceBackedRows = sentRows.filter((row) => hasSubmissionEvidence(row));
  const unevidencedSentRoutes = sentRows
    .filter((row) => !hasSubmissionEvidence(row))
    .map((row) => row.route_id);

  return {
    evidenceBackedSubmissions: evidenceBackedRows.length,
    unevidencedSentRoutes,
  };
}

function hasSubmissionEvidence(row) {
  if (Number(row.file_check_count || 0) > 0 || Number(row.paid_order_count || 0) > 0) {
    return true;
  }

  if (row.pilot_requested === "yes") {
    return true;
  }

  if (row.status !== "sent" && row.response_type && row.response_type !== "none") {
    return hasText(row.reply_notes);
  }

  return /\bvisible form success observed\b/i.test(row.reply_notes);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function extractNumber(markdown, label) {
  const value = extractText(markdown, label);
  return Number(value.replace(/,/g, "")) || 0;
}

function extractText(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`\\|\\s*\`?${escaped}\`?\\s*\\|\\s*([^|]+?)\\s*\\|`, "i"));
  return match ? match[1].trim().replace(/^`|`$/g, "") : "";
}

function extractRouteSet(markdown, label) {
  const routeCell = extractText(markdown, label);
  return Array.from(routeCell.matchAll(/\b(b\d{2}-r\d{2})\b/g)).map((match) => match[1]);
}

function statusFor(value) {
  return value ? "pass" : "pending";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

async function main() {
  const options = parseTractionReadinessArgs(process.argv.slice(2));
  const [publicAuditMarkdown, batchCsv, resultsCsv, sendabilityAuditJson, contactReconJson] = await Promise.all([
    fs.readFile(options.publicAuditPath, "utf8"),
    fs.readFile(options.batchPath, "utf8"),
    fs.readFile(options.resultsPath, "utf8"),
    fs.readFile(options.sendabilityAuditPath, "utf8"),
    fs.readFile(options.contactReconPath, "utf8").catch(() => "{}"),
  ]);
  const batchRows = parseOutreachLedger(batchCsv);
  const resultRows = parseOutreachResults(resultsCsv);
  const sendabilityAudit = JSON.parse(sendabilityAuditJson);
  const contactRecon = JSON.parse(contactReconJson);
  const errors = [
    ...validateOutreachLedger(batchRows),
    ...validateOutreachResults(resultRows),
    ...validateOutreachSendabilityAudit(sendabilityAudit, batchRows, resultRows),
  ];

  if (errors.length > 0) {
    for (const error of [...new Set(errors)]) {
      console.error(`TRACTION_READINESS=pending ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const emailReport = options.skipEmail
    ? { ready: false, dnsReady: false, checks: [] }
    : await inspectOutreachEmailDns({ aliasTested: Boolean(options.aliasTested) });
  const readyRoutesForPackets = (sendabilityAudit.routes ?? [])
    .filter((route) => route.sendability === "browser_form_ready")
    .map((route) => ({
      route_id: route.route_id,
      company_or_channel: route.company_or_channel ?? batchRows.find((row) => row.route_id === route.route_id)?.company_or_channel ?? route.route_id,
      route_url: route.route_url,
    }));
  const [sendReadyPackets, submitPreflightPackets, liveSubmitReport] = await Promise.all([
    loadSendReadyPackets(readyRoutesForPackets),
    loadSubmitPreflightPackets(readyRoutesForPackets),
    loadLiveSubmitReport(options.liveSubmitReportPath),
  ]);
  const score = scoreTractionReadiness({
    publicAuditMarkdown,
    batchRows,
    resultRows,
    sendabilityAudit,
    contactRecon,
    emailReport,
    sendReadyPackets,
    submitPreflightPackets,
    liveSubmitReport,
  });
  const markdown = renderTractionReadinessScorecard(score, { generatedAt: options.generatedAt });

  if (options.outputPath) {
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, markdown, "utf8");
  } else {
    process.stdout.write(markdown);
  }

  console.log(
    [
      "TRACTION_READINESS=pass",
      `state=${score.currentState}`,
      `ready_routes=${score.outreach.readyBrowserFormRoutes}`,
      `packet_ready=${score.outreach.packetReadyRoutes}`,
      `preflight_ready=${score.outreach.submitPreflightReadyRoutes}`,
      `live_ready=${score.outreach.liveSubmitReadyRoutes ?? "not_checked"}`,
      `sent=${score.outreach.sentOrBeyond}`,
      `replies=${score.outreach.replies}`,
      `file_checks=${score.outreach.fileChecks}`,
      `paid_orders=${score.outreach.paidOrders}`,
      `email_ready=${score.email.ready}`,
      `reply_capture_ready=${score.email.replyCaptureReady}`,
      ...(options.outputPath ? [`output=${options.outputPath}`] : []),
    ].join(" "),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`TRACTION_READINESS=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
