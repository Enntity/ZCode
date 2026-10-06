import assert from "node:assert/strict";
import test from "node:test";
import {
  ZCODE_DYNAMIC_WORKFLOW_MODE_ENV,
  type ApiClient,
} from "@zcode/shared";
import { BigModelCodingPlanSubscriptionProvider } from "./bigmodelCodingPlanSubscriptionProvider.js";

function createProvider(): BigModelCodingPlanSubscriptionProvider {
  const apiClient = new Proxy({}, {
    get() {
      assert.fail("Enntity dynamic workflow settings must not make a vendor API request");
    },
  }) as ApiClient;
  return new BigModelCodingPlanSubscriptionProvider({
    apiClient,
    credentialService: { load: async () => null },
  });
}

test("Enntity enables local dynamic workflows without reading vendor rollout config", async () => {
  const previous = process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV];
  delete process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV];
  try {
    assert.deepEqual(await createProvider().getDynamicWorkflowClientConfig(), {
      mode: "alwaysOn",
      enabled: true,
      source: "default",
    });
  } finally {
    if (previous === undefined) delete process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV];
    else process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV] = previous;
  }
});

test("Enntity honors an explicit local dynamic workflow override without a vendor request", async () => {
  const previous = process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV];
  process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV] = "disabled";
  try {
    assert.deepEqual(await createProvider().getDynamicWorkflowClientConfig(), {
      mode: "disabled",
      enabled: false,
      source: "override",
    });
  } finally {
    if (previous === undefined) delete process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV];
    else process.env[ZCODE_DYNAMIC_WORKFLOW_MODE_ENV] = previous;
  }
});

test("Enntity returns absent vendor subscription metadata instead of synthesizing entitlements", async () => {
  const provider = createProvider();

  assert.equal(await provider.getStartPlanPreview(), null);
  assert.equal(await provider.getForceUpdateConfig(), null);
  assert.equal((await provider.getOffPeakClientConfig()).enabled, false);
  await assert.rejects(provider.getStaticProducts(), /missing Coding Plan products/u);
});
