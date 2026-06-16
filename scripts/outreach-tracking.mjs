export const TRACKING_SOURCE = "proof_led_batch_01";
export const TRACKING_MEDIUM = "outreach";
export const TRACKING_CAMPAIGN = "eudr_file_readiness";
export const PROOF_BASE_URL = "https://traceready.online/proof/public-cocoa-pilot/";
export const FIELD_NOTE_BASE_URL = "https://traceready.online/field-notes/eudr-file-errors/";
export const FILE_CHECK_BASE_URL = "https://traceready.online/";
export const PILOT_PROOF_BASE_URL = "https://traceready.online/pilot-proof/";

export function routeIdForRowNumber(rowNumber, batchKey = "b01") {
  return `${batchKey}-r${String(rowNumber).padStart(2, "0")}`;
}

export function batchKeyForRouteId(routeId) {
  const match = String(routeId ?? "").match(/^(b\d{2})-r\d{2}$/);
  return match?.[1] ?? "b01";
}

export function trackingSourceForRouteId(routeId) {
  const batchNumber = batchKeyForRouteId(routeId).slice(1);
  return `proof_led_batch_${batchNumber}`;
}

export function trackedProofUrl(routeId) {
  return trackedUrl(PROOF_BASE_URL, routeId);
}

export function trackedFieldNoteUrl(routeId) {
  return trackedUrl(FIELD_NOTE_BASE_URL, routeId);
}

export function trackedFileCheckUrl(routeId) {
  return trackedUrl(FILE_CHECK_BASE_URL, routeId);
}

export function trackedPilotProofUrl(routeId) {
  return trackedUrl(PILOT_PROOF_BASE_URL, routeId);
}

function trackedUrl(baseUrl, routeId) {
  const params = new URLSearchParams({
    utm_source: trackingSourceForRouteId(routeId),
    utm_medium: TRACKING_MEDIUM,
    utm_campaign: TRACKING_CAMPAIGN,
    utm_content: routeId,
  });

  return `${baseUrl}?${params.toString()}`;
}
