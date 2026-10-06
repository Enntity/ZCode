import assert from "node:assert/strict";
import test from "node:test";
import { shouldEnableProviderAvailabilityLoginEntryGuard } from "./rootStartupGate.js";

test("Enntity local-model startup does not require a vendor OAuth login", () => {
  assert.equal(shouldEnableProviderAvailabilityLoginEntryGuard("enntity"), false);
  assert.equal(shouldEnableProviderAvailabilityLoginEntryGuard("production"), true);
  assert.equal(shouldEnableProviderAvailabilityLoginEntryGuard("preview"), true);
});
