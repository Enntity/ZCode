import assert from "node:assert/strict";
import test from "node:test";
import { createElectronDesktopContextPromptConfigFetcher } from "./desktopContextPromptRollout.js";

test("Enntity desktop context rollout returns a local empty config without resolving a vendor endpoint", async () => {
  let endpointLookups = 0;
  const fetchConfig = createElectronDesktopContextPromptConfigFetcher({
    appVersion: "1.0.0",
    deviceMid: "local-test-device",
    resolveEndpointOrigin: async () => {
      endpointLookups += 1;
      return "https://unused.example";
    },
    getClientLanguage: () => "en-US",
  });

  assert.deepEqual(await fetchConfig(new AbortController().signal), {});
  assert.equal(endpointLookups, 0);
});
