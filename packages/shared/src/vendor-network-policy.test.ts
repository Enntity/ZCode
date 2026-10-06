import assert from "node:assert/strict";
import test from "node:test";
import { isBlockedVendorHost, isBlockedVendorUrl } from "./vendor-network-policy.js";

test("blocks vendor domains, subdomains, case variants, and trailing dots", () => {
  for (const host of [
    "api.z.ai",
    "Z.AI",
    "CHAT.Z.AI.",
    "open.bigmodel.cn",
    "foo.zhipuai.com",
    "chatglm.cn",
    "cdn.aminer.cn",
  ]) {
    assert.equal(isBlockedVendorHost(host), true, host);
  }
  assert.equal(isBlockedVendorHost("notz.ai"), false);
});

test("allows LLooM loopback and unrelated destinations", () => {
  assert.equal(isBlockedVendorUrl("http://127.0.0.1:8100/v1"), false);
  assert.equal(isBlockedVendorUrl("https://example.org/api"), false);
});

test("parses redirect targets through the same host policy", () => {
  const redirect = new URL("https://chat.z.ai/authorize");
  assert.equal(isBlockedVendorUrl(redirect), true);
});
