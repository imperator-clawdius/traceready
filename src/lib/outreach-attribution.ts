export type OutreachAttribution = {
  routeId: string;
  source?: string;
  medium?: string;
  campaign?: string;
};

const ROUTE_ID_PATTERN = /^b01-r\d{2}$/;
const ALLOWED_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export function parseOutreachAttribution(search: string): OutreachAttribution | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const routeId = params.get("utm_content")?.trim() ?? "";

  if (!ROUTE_ID_PATTERN.test(routeId)) {
    return null;
  }

  return {
    routeId,
    source: cleanParam(params.get("utm_source")),
    medium: cleanParam(params.get("utm_medium")),
    campaign: cleanParam(params.get("utm_campaign")),
  };
}

export function appendOutreachSearch(path: string, search: string): string {
  const attribution = parseOutreachAttribution(search);

  if (!attribution) {
    return path;
  }

  const sourceParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const nextParams = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const value = cleanParam(sourceParams.get(key));

    if (value) {
      nextParams.set(key, value);
    }
  }

  return `${path}?${nextParams.toString()}`;
}

export function formatOutreachAttributionLines(attribution: OutreachAttribution | null | undefined): string[] {
  if (!attribution) {
    return [];
  }

  return [
    `Outreach route: ${attribution.routeId}`,
    attribution.source ? `Outreach source: ${attribution.source}` : "",
    attribution.medium ? `Outreach medium: ${attribution.medium}` : "",
    attribution.campaign ? `Outreach campaign: ${attribution.campaign}` : "",
  ].filter(Boolean);
}

function cleanParam(value: string | null): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}
