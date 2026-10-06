import assert from "node:assert/strict";
import test from "node:test";
import {
  appendOpenRouterWebSearchCitations,
  createOpenRouterFlashXWebSearchFetch,
  OPENROUTER_WEB_SEARCH_MARKER,
  serializeOpenRouterWebSearchMarkerMetadata,
  transformOpenRouterFlashXWebSearchRequest,
} from "./openrouter-flashx-web-search.ts";

const route = {
  providerId: "enntity-lloom",
  modelId: "z-ai/glm-5.3-flashx",
  providerKind: "openai-compatible",
  baseURL: "http://127.0.0.1:8100/v1",
  requestUrl: "http://127.0.0.1:8100/v1/chat/completions",
};

function body(tools = [{
  type: "function",
  function: {
    name: OPENROUTER_WEB_SEARCH_MARKER,
    description: serializeOpenRouterWebSearchMarkerMetadata({}),
  },
}]) {
  return JSON.stringify({ model: route.modelId, messages: [{ role: "user", content: "query" }], tools });
}

test("rewrites only the single marked WebSearch tool on the exact LLooM FlashX route", () => {
  const result = transformOpenRouterFlashXWebSearchRequest({ ...route, body: body() });
  assert.equal(result.transformed, true);
  const request = JSON.parse(result.body);
  assert.deepEqual(request.tools, [
    {
      type: "openrouter:web_search",
      parameters: {
        engine: "exa",
        max_uses: 1,
        max_results: 2,
        max_total_results: 2,
      },
    },
  ]);
  assert.deepEqual(request.messages, [{ role: "user", content: "query" }]);
});

test("preserves allowed and blocked-domain filters in OpenRouter parameter names", () => {
  const allowed = body([
    {
      type: "function",
      function: {
        name: OPENROUTER_WEB_SEARCH_MARKER,
        description: serializeOpenRouterWebSearchMarkerMetadata({ allowedDomains: ["example.org"] }),
      },
    },
  ]);
  const allowedResult = transformOpenRouterFlashXWebSearchRequest({ ...route, body: allowed });
  assert.deepEqual(JSON.parse(allowedResult.body).tools[0].parameters, {
    engine: "exa",
    max_uses: 1,
    max_results: 2,
    max_total_results: 2,
    allowed_domains: ["example.org"],
  });

  const blocked = body([
    {
      type: "function",
      function: {
        name: OPENROUTER_WEB_SEARCH_MARKER,
        description: serializeOpenRouterWebSearchMarkerMetadata({ blockedDomains: ["vendor.example"] }),
      },
    },
  ]);
  const blockedResult = transformOpenRouterFlashXWebSearchRequest({ ...route, body: blocked });
  assert.deepEqual(JSON.parse(blockedResult.body).tools[0].parameters, {
    engine: "exa",
    max_uses: 1,
    max_results: 2,
    max_total_results: 2,
    excluded_domains: ["vendor.example"],
  });
});

test("leaves ordinary tools and every route mismatch unchanged", () => {
  const ordinaryBody = body([{ type: "function", function: { name: "read_file" } }]);
  for (const mismatch of [
    { providerId: "other-provider" },
    { modelId: "other/model" },
    { providerKind: "openai" },
    { baseURL: "https://openrouter.ai/api/v1" },
    { requestUrl: "http://127.0.0.1:8100/v1/responses" },
  ]) {
    const source = ordinaryBody;
    const result = transformOpenRouterFlashXWebSearchRequest({ ...route, ...mismatch, body: source });
    assert.equal(result.transformed, false);
    assert.equal(result.body, source);
  }
  const ordinary = transformOpenRouterFlashXWebSearchRequest({ ...route, body: ordinaryBody });
  assert.equal(ordinary.transformed, false);
  assert.equal(ordinary.body, ordinaryBody);
  const mixed = body([
    {
      type: "function",
      function: {
        name: OPENROUTER_WEB_SEARCH_MARKER,
        description: serializeOpenRouterWebSearchMarkerMetadata({}),
      },
    },
    { type: "function", function: { name: "read_file" } },
  ]);
  assert.equal(transformOpenRouterFlashXWebSearchRequest({ ...route, body: mixed }).transformed, false);
  assert.throws(() =>
    transformOpenRouterFlashXWebSearchRequest({
      ...route,
      providerId: "other-provider",
      body: body(),
    }),
  );
});

test("rejects conflicting domain metadata instead of broadening the search", () => {
  const conflicting = body([
    {
      type: "function",
      function: {
        name: OPENROUTER_WEB_SEARCH_MARKER,
        description: serializeOpenRouterWebSearchMarkerMetadata({
          allowedDomains: ["example.org"],
          blockedDomains: ["vendor.example"],
        }),
      },
    },
  ]);
  assert.throws(() => transformOpenRouterFlashXWebSearchRequest({ ...route, body: conflicting }));
});

test("converts valid URL citation annotations to Markdown and preserves reported search usage", async () => {
  const response = new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: "A sourced answer.",
            annotations: [
              { type: "url_citation", url_citation: { title: "Source A", url: "https://example.test/a" } },
              { type: "url_citation", url_citation: { title: "Source A", url: "https://example.test/a" } },
              { type: "url_citation", url_citation: { title: "Unsafe", url: "javascript:alert(1)" } },
            ],
          },
        },
      ],
      usage: { server_tool_use_details: { web_search_requests: 1 } },
    }),
    { headers: { "content-type": "application/json" } },
  );

  const normalized = await appendOpenRouterWebSearchCitations(response);
  const payload = await normalized.json();
  assert.match(payload.choices[0].message.content, /- \[Source A\]\(https:\/\/example\.test\/a\)/u);
  assert.equal(payload.usage.server_tool_use.web_search_requests, 1);
});

test("scoped fetch sends the server tool and returns citations without a network call", async () => {
  let capturedUrl;
  let capturedBody;
  const fetch = createOpenRouterFlashXWebSearchFetch({
    ...route,
    fetch: async (input, init) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Evidence-backed result.",
                annotations: [
                  { type: "url_citation", url_citation: { title: "Evidence", url: "https://example.test/evidence" } },
                ],
              },
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });

  const response = await fetch(route.requestUrl, { method: "POST", body: body() });
  assert.equal(capturedUrl, route.requestUrl);
  assert.equal(capturedBody.tools[0].type, "openrouter:web_search");
  assert.match((await response.json()).choices[0].message.content, /\[Evidence\]\(https:\/\/example\.test\/evidence\)/u);
});

test("does not invent sources or alter streamed response bodies", async () => {
  const empty = new Response(
    JSON.stringify({ choices: [{ message: { content: "No sources.", annotations: [] } }] }),
    { headers: { "content-type": "application/json" } },
  );
  const unchangedEmpty = await appendOpenRouterWebSearchCitations(empty);
  assert.equal((await unchangedEmpty.json()).choices[0].message.content, "No sources.");

  const stream = new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
  assert.equal(await appendOpenRouterWebSearchCitations(stream), stream);
});
