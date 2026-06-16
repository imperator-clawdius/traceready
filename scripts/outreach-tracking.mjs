export const TRACKING_SOURCE = "proof_led_batch_01";
export const TRACKING_MEDIUM = "outreach";
export const TRACKING_CAMPAIGN = "eudr_file_readiness";
export const PROOF_BASE_URL = "https://traceready.online/proof/";
export const FIELD_NOTE_BASE_URL = "https://traceready.online/field-notes/eudr-file-errors/";
export const FILE_CHECK_BASE_URL = "https://traceready.online/";

export function routeIdForRowNumber(rowNumber) {
  return `b01-r${String(rowNumber).padStart(2, "0")}`;
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

function trackedUrl(baseUrl, routeId) {
  const params = new URLSearchParams({
    utm_source: TRACKING_SOURCE,
    utm_medium: TRACKING_MEDIUM,
    utm_campaign: TRACKING_CAMPAIGN,
    utm_content: routeId,
  });

  return `${baseUrl}?${params.toString()}`;
}
