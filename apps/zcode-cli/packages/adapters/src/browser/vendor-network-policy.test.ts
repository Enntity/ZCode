import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserContext, Request, Route, WebSocketRoute } from "playwright-core";
import {
  buildManagedBrowserVendorResolverRules,
  installManagedBrowserVendorPolicy,
} from "./vendor-network-policy.js";

test("managed Chromium resolver rules deny vendor suffixes and trailing-dot hosts", () => {
  const rules = buildManagedBrowserVendorResolverRules();
  assert.ok(rules.includes("MAP z.ai ~NOTFOUND"));
  assert.ok(rules.includes("MAP *.z.ai ~NOTFOUND"));
  assert.ok(rules.includes("MAP z.ai. ~NOTFOUND"));
  assert.ok(rules.includes("MAP *.z.ai. ~NOTFOUND"));
  assert.ok(rules.includes("MAP zhipu-ai.feishu.cn ~NOTFOUND"));
});

test("managed browser policy blocks vendor requests and preserves unrelated requests", async () => {
  let requestHandler:
    | ((route: Route, request: Request) => Promise<void> | void)
    | undefined;
  const context = {
    route: async (_pattern: unknown, handler: typeof requestHandler) => {
      requestHandler = handler;
    },
    routeWebSocket: async () => {},
  } as unknown as Pick<BrowserContext, "route" | "routeWebSocket">;
  await installManagedBrowserVendorPolicy(context);
  assert.ok(requestHandler);

  const checkRequest = async (url: string) => {
    const result = { action: "" };
    const route = {
      request: () => ({
        url: () => url,
      }),
      abort: async (reason?: string) => {
        result.action = `abort:${reason ?? ""}`;
      },
      continue: async () => {
        result.action = "continue";
      },
    } as unknown as Route;
    await requestHandler!(route, {} as Request);
    return result.action;
  };

  assert.equal(await checkRequest("https://api.z.ai/start"), "abort:blockedbyclient");
  assert.equal(await checkRequest("https://cdn.bigmodel.cn/asset.js"), "abort:blockedbyclient");
  assert.equal(await checkRequest("http://127.0.0.1:8100/page"), "continue");
  assert.equal(await checkRequest("https://example.org/page"), "continue");
});

test("managed browser routes block vendor WebSockets and proxy unrelated destinations", async () => {
  let webSocketHandler: ((route: WebSocketRoute) => Promise<unknown> | unknown) | undefined;
  const context = {
    route: async () => {},
    routeWebSocket: async (
      _pattern: unknown,
      handler: typeof webSocketHandler,
    ) => {
      webSocketHandler = handler;
    },
  } as unknown as Pick<BrowserContext, "route" | "routeWebSocket">;
  await installManagedBrowserVendorPolicy(context);
  assert.ok(webSocketHandler);

  const checkWebSocket = async (url: string) => {
    const result = { action: "" };
    const route = {
      url: () => url,
      close: async ({ code }: { code?: number } = {}) => {
        result.action = `close:${code}`;
      },
      connectToServer: () => {
        result.action = "connect";
        return {} as WebSocketRoute;
      },
    } as unknown as WebSocketRoute;
    await webSocketHandler!(route);
    return result.action;
  };

  assert.equal(await checkWebSocket("wss://chat.z.ai/socket"), "close:1008");
  assert.equal(await checkWebSocket("ws://127.0.0.1:8100/socket"), "connect");
  assert.equal(await checkWebSocket("wss://example.org/socket"), "connect");
});
