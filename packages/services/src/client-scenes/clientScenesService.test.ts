import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "@zcode/shared";
import { createClientScenesService } from "./clientScenesService.js";

test("Enntity client scenes use an empty local fallback without contacting the vendor API", async () => {
  const apiClient = new Proxy({}, {
    get() {
      assert.fail("Enntity client scenes must not access the API client");
    },
  }) as ApiClient;

  assert.deepEqual(await createClientScenesService({ apiClient }).list(), {
    code: 0,
    msg: "",
    data: [],
  });
});
