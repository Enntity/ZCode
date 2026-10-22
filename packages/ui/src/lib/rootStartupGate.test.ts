import assert from "node:assert/strict";
import test from "node:test";
import { shouldEnableProviderAvailabilityLoginEntryGuard } from "./rootStartupGate.js";

test("Enntity local-model startup does not require a vendor OAuth login", () => {
  assert.equal(
    shouldEnableProviderAvailabilityLoginEntryGuard({
      productFlavor: "enntity",
      isWebRemoteControlRoot: false,
    }),
    false,
  );
  assert.equal(
    shouldEnableProviderAvailabilityLoginEntryGuard({
      productFlavor: "production",
      isWebRemoteControlRoot: false,
    }),
    true,
  );
  assert.equal(
    shouldEnableProviderAvailabilityLoginEntryGuard({
      productFlavor: "preview",
      isWebRemoteControlRoot: false,
    }),
    true,
  );
});
