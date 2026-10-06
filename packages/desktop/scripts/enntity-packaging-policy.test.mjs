import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import config from "../electron-builder.config.js";

test("packaging uses the manifest runtime and isolated fork identity", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(config.electronVersion, manifest.devDependencies.electron);
  assert.equal(config.appId, "com.enntity.zcode");
  assert.equal(config.productName, "Enntity ZCode");
  assert.equal(config.mac.minimumSystemVersion, "13.0");
  assert.deepEqual(config.publish, []);
  assert.equal(config.mac.notarize, false);
});
