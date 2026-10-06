import assert from "node:assert/strict";
import { createServer } from "node:http";
import { request as namedHttpRequest } from "node:http";
import test from "node:test";
import { installVendorNetworkGuard } from "./vendor-network-guard.js";

installVendorNetworkGuard();

test("denies vendor fetch and socket connections before network access", async () => {
  await assert.rejects(fetch("https://api.z.ai/path"), /blocks managed requests/u);
  await assert.rejects(fetch("https://zhipu-ai.feishu.cn/form"), /blocks managed requests/u);
  const socket = new (await import("node:net")).Socket();
  assert.throws(() => socket.connect({ host: "api.z.ai", port: 443 }), /blocks managed requests/u);
});

test("denies HTTP, HTTPS, TLS overloads, and Host header overrides before opening sockets", async () => {
  const http = await import("node:http");
  const https = await import("node:https");
  const tls = await import("node:tls");
  assert.throws(() => http.request("http://api.z.ai/v1"), /blocks managed requests/u);
  assert.throws(() => namedHttpRequest("http://api.z.ai/v1"), /blocks managed requests/u);
  assert.throws(() => https.get(new URL("https://api.z.ai/v1")), /blocks managed requests/u);
  assert.throws(() => https.request({ hostname: "api.bigmodel.cn", path: "/v1" }), /blocks managed requests/u);
  assert.throws(() => http.request({ hostname: "127.0.0.1", headers: { host: "api.z.ai" } }), /blocks managed requests/u);
  assert.throws(() => tls.connect({ host: "127.0.0.1", servername: "api.z.ai", port: 443 }), /blocks managed requests/u);
  assert.throws(() => tls.connect(443, "api.z.ai"), /blocks managed requests/u);
});

test("a local redirect to a vendor host is stopped at the socket boundary", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(302, { location: "https://chat.z.ai/authorize" });
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await assert.rejects(
      fetch(`http://127.0.0.1:${address.port}/redirect`),
      (error: unknown) => {
        let current: unknown = error;
        for (let depth = 0; depth < 8 && current instanceof Error; depth += 1) {
          if (/blocks managed requests/u.test(current.message)) return true;
          current = current.cause;
        }
        return false;
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
