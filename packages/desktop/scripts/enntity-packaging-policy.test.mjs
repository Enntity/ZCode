import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import config from "../electron-builder.config.js";
import { createMacSigningHook } from "./mac-signing.mjs";

test("packaging uses the manifest runtime and isolated fork identity", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(config.electronVersion, manifest.devDependencies.electron);
  assert.equal(config.appId, "com.enntity.zcode");
  assert.equal(config.productName, "Enntity ZCode");
  assert.equal(config.mac.minimumSystemVersion, "13.0.0");
  assert.deepEqual(config.publish, []);
  assert.equal(config.mac.notarize, false);
  assert.deepEqual(config.protocols[0].schemes, ["enntity-zcode"]);
  assert.equal(typeof config.mac.sign, "function");
});

test("custom mac signer preserves the selected certificate hash for validation", async () => {
  const calls = [];
  const signer = createMacSigningHook({
    shouldSign: true,
    loadSignAsync: () => async (options) => calls.push(options),
  });
  const options = {
    identity: "A5765C3BBB6309C95BEC24118EE7D41E5F148350",
    identityValidation: false,
  };
  await signer(options);
  assert.deepEqual(calls, [{ ...options, identityValidation: true }]);

  const unsigned = createMacSigningHook({
    shouldSign: false,
    loadSignAsync: () => {
      throw new Error("unsigned builds must not load the signer");
    },
  });
  await unsigned({ identity: null });
});
