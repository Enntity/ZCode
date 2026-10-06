import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decodeZCodeBuiltinRelease } from "../../packages/provider-node/src/zcode-builtin-release.ts";

test("built-in provider seed is LLooM-only and exposes the verified Flash X route", async () => {
  const seed = JSON.parse(await readFile(new URL("./zcode-builtin.json", import.meta.url), "utf8"));
  const decoded = decodeZCodeBuiltinRelease(seed);
  assert.deepEqual(decoded.config.providers.keys(), ["enntity-lloom"]);
  const disallowedStandardPersonal = structuredClone(seed);
  disallowedStandardPersonal.config.providerConfigRules.providerRules[0].providerId =
    "other-provider";
  assert.throws(() => decodeZCodeBuiltinRelease(disallowedStandardPersonal));
  const templates = seed.config.providerConfigRules.templateRules;
  assert.equal(templates.length, 1);
  assert.equal(templates[0].templateId, "enntity-lloom");
  assert.equal(templates[0].config.api.baseUrl, "http://127.0.0.1:8100/v1");
  assert.equal("apiKey" in templates[0].config.access, false);
  assert.equal(seed.config.providerConfigRules.providerRules[0].config.group, "standard-personal");
  assert.deepEqual(templates[0].config.builtinModelIds, ["z-ai/glm-5.3-flashx"]);
  assert.deepEqual(
    seed.config.providerConfigRules.providerRules.map((provider) => provider.providerId),
    ["enntity-lloom"],
  );
  const route = seed.config.modelConfigRules.modelRules.find(
    (rule) => rule.modelMatch === "^z-ai/glm-5\\.3-flashx$",
  );
  assert.equal(route.config.properties.contextWindow, 1048576);
  assert.equal(route.config.optionSpecs.maxOutputTokens.max, 131072);
  assert.deepEqual(route.config.optionSpecs.reasoningLevel.values, ["low", "high", "max"]);
});
