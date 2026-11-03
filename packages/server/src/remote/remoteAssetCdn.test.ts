import assert from "node:assert/strict";
import test from "node:test";
import { resolveRemoteCdnBaseUrls } from "./remoteAssetCdn.js";

test("remote asset sources never include vendor CDNs", () => {
  assert.deepEqual(
    resolveRemoteCdnBaseUrls({
      remoteCdnBaseUrls: [
        "https://cdn-zcode.z.ai/zcode/electron/releases/3.17.2",
        "https://cdn.codegeex.cn/zcode/electron/releases/3.17.2",
        "https://assets.example.org/zcode/3.17.2",
      ],
    }),
    ["https://assets.example.org/zcode/3.17.2"],
  );
});
