export const OPENROUTER_WEB_SEARCH_MARKER = "__zcode_openrouter_web_search__";
export const OPENROUTER_WEB_SEARCH_MARKER_PREFIX = "zcode-openrouter-web-search:";

export const OPENROUTER_FLASHX_WEBSEARCH_MODEL_ID = "z-ai/glm-5.3-flashx";
const TARGET_PROVIDER_ID = "enntity-lloom";
const TARGET_MODEL_ID = OPENROUTER_FLASHX_WEBSEARCH_MODEL_ID;
const TARGET_BASE_URL = "http://127.0.0.1:8100/v1";
const TARGET_REQUEST_URL = "http://127.0.0.1:8100/v1/chat/completions";

const SERVER_TOOL = {
  type: "openrouter:web_search",
  parameters: {
    engine: "exa",
    max_uses: 1,
    max_results: 2,
    max_total_results: 2,
  },
};

export interface OpenRouterFlashXWebSearchRoute {
  providerId: string;
  modelId: string;
  providerKind: string;
  baseURL?: string;
}

export function supportsOpenRouterFlashXWebSearch(route: OpenRouterFlashXWebSearchRoute): boolean {
  return (
    route.providerId === TARGET_PROVIDER_ID &&
    route.modelId === TARGET_MODEL_ID &&
    route.providerKind === "openai-compatible" &&
    route.baseURL === TARGET_BASE_URL
  );
}

export interface OpenRouterRequestTransformInput extends OpenRouterFlashXWebSearchRoute {
  requestUrl: string;
  body: string;
}

export interface OpenRouterRequestTransformResult {
  body: string;
  transformed: boolean;
}

export function serializeOpenRouterWebSearchMarkerMetadata(args: {
  allowedDomains?: string[];
  blockedDomains?: string[];
}): string {
  return `${OPENROUTER_WEB_SEARCH_MARKER_PREFIX}${JSON.stringify({
    allowedDomains: args.allowedDomains,
    blockedDomains: args.blockedDomains,
  })}`;
}

/** Rewrites only ZCode's private WebSearch marker on the one configured LLooM route. */
export function transformOpenRouterFlashXWebSearchRequest(
  input: OpenRouterRequestTransformInput,
): OpenRouterRequestTransformResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.body);
  } catch {
    return { body: input.body, transformed: false };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.tools)) {
    return { body: input.body, transformed: false };
  }

  const hasMarker = parsed.tools.some(
    (candidate) => isRecord(candidate) && isRecord(candidate.function) && candidate.function.name === OPENROUTER_WEB_SEARCH_MARKER,
  );
  const routeMatches = supportsOpenRouterFlashXWebSearch(input) && input.requestUrl === TARGET_REQUEST_URL;
  if (!routeMatches) {
    if (hasMarker) throw new Error("OpenRouter WebSearch marker is restricted to the configured LLooM FlashX route");
    return { body: input.body, transformed: false };
  }
  if (parsed.model !== TARGET_MODEL_ID || !hasMarker) return { body: input.body, transformed: false };

  // Requiring the sole marker tool prevents accidental conversion of user-defined
  // tools, even if a caller happens to choose the internal marker name.
  if (
    parsed.tools.length !== 1 ||
    !isRecord(parsed.tools[0]) ||
    parsed.tools[0].type !== "function" ||
    !isRecord(parsed.tools[0].function) ||
    parsed.tools[0].function.name !== OPENROUTER_WEB_SEARCH_MARKER
  ) {
    return { body: input.body, transformed: false };
  }

  const description = parsed.tools[0].function.description;
  const args = parseMarkerMetadata(description);
  const parameters = {
    ...SERVER_TOOL.parameters,
    ...(args.allowedDomains ? { allowed_domains: args.allowedDomains } : {}),
    ...(args.blockedDomains ? { excluded_domains: args.blockedDomains } : {}),
  };

  return {
    body: JSON.stringify({ ...parsed, tools: [{ ...SERVER_TOOL, parameters }] }),
    transformed: true,
  };
}

function parseMarkerMetadata(value: unknown): { allowedDomains?: string[]; blockedDomains?: string[] } {
  if (typeof value !== "string" || !value.startsWith(OPENROUTER_WEB_SEARCH_MARKER_PREFIX)) {
    throw new Error("OpenRouter WebSearch marker metadata is missing");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.slice(OPENROUTER_WEB_SEARCH_MARKER_PREFIX.length));
  } catch {
    throw new Error("OpenRouter WebSearch marker metadata is invalid");
  }
  if (!isRecord(parsed) || Object.keys(parsed).some((key) => !["allowedDomains", "blockedDomains"].includes(key))) {
    throw new Error("OpenRouter WebSearch marker metadata is invalid");
  }
  const allowedDomains = domainList(parsed.allowedDomains);
  const blockedDomains = domainList(parsed.blockedDomains);
  if (parsed.allowedDomains !== undefined && !allowedDomains) {
    throw new Error("OpenRouter WebSearch allowed-domain metadata is invalid");
  }
  if (parsed.blockedDomains !== undefined && !blockedDomains) {
    throw new Error("OpenRouter WebSearch blocked-domain metadata is invalid");
  }
  if (allowedDomains?.length && blockedDomains?.length) {
    throw new Error("OpenRouter WebSearch cannot combine allowed and excluded domains");
  }
  return { allowedDomains, blockedDomains };
}

function domainList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    return undefined;
  }
  return value.map((item) => (item as string).trim());
}

/** Convert OpenRouter URL annotations to Markdown links consumed by WebSearch's existing normalizer. */
export async function appendOpenRouterWebSearchCitations(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return response;

  let payload: unknown;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return response;

  let changed = false;
  const choices = payload.choices.map((choice) => {
    if (!isRecord(choice) || !isRecord(choice.message)) return choice;
    const links = citationLinks(choice.message.annotations);
    const content = choice.message.content;
    if (links.length === 0 || typeof content !== "string") return choice;
    const missingLinks = links.filter((link) => {
      const markdownUrl = encodeMarkdownUrl(link.url);
      return !content.includes(`](${link.url})`) && !content.includes(`](${markdownUrl})`);
    });
    if (missingLinks.length === 0) return choice;
    changed = true;
    return {
      ...choice,
      message: {
        ...choice.message,
        content: `${content.trimEnd()}\n\nSources:\n${missingLinks.map((link) => `- [${link.title}](${encodeMarkdownUrl(link.url)})`).join("\n")}`,
      },
    };
  });

  const usage = isRecord(payload.usage) ? payload.usage : undefined;
  const details = usage && isRecord(usage.server_tool_use_details) ? usage.server_tool_use_details : undefined;
  const serverUse = usage && isRecord(usage.server_tool_use) ? usage.server_tool_use : undefined;
  const searchRequests = numberValue(details?.web_search_requests);
  const normalizedUsage =
    usage && searchRequests !== undefined && numberValue(serverUse?.web_search_requests) === undefined
      ? { ...usage, server_tool_use: { ...serverUse, web_search_requests: searchRequests } }
      : usage;
  if (normalizedUsage !== usage) changed = true;
  if (!changed) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(
    JSON.stringify({ ...payload, choices, ...(normalizedUsage ? { usage: normalizedUsage } : {}) }),
    { status: response.status, statusText: response.statusText, headers },
  );
}

export function createOpenRouterFlashXWebSearchFetch(
  route: OpenRouterFlashXWebSearchRoute & { fetch: typeof globalThis.fetch },
): typeof globalThis.fetch {
  return async (input, init) => {
    if (typeof init?.body !== "string") return route.fetch(input, init);
    const requestUrl = requestUrlString(input);
    if (!requestUrl) return route.fetch(input, init);
    const transformed = transformOpenRouterFlashXWebSearchRequest({
      ...route,
      requestUrl,
      body: init.body,
    });
    if (!transformed.transformed) return route.fetch(input, init);
    const response = await route.fetch(input, { ...init, body: transformed.body });
    return appendOpenRouterWebSearchCitations(response);
  };
}

function requestUrlString(input: RequestInfo | URL): string | undefined {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function citationLinks(value: unknown): Array<{ title: string; url: string }> {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((annotation) => {
    if (!isRecord(annotation) || annotation.type !== "url_citation") return [];
    const citation = isRecord(annotation.url_citation) ? annotation.url_citation : annotation;
    const rawUrl = citation.url;
    if (typeof rawUrl !== "string") return [];
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return [];
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || seen.has(url.href)) return [];
    seen.add(url.href);
    const title = typeof citation.title === "string" && citation.title.trim() ? citation.title.trim() : url.hostname;
    return [{ title: title.replace(/[\[\]\r\n]/g, " "), url: url.href }];
  });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function encodeMarkdownUrl(value: string): string {
  return value.replaceAll("(", "%28").replaceAll(")", "%29");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
