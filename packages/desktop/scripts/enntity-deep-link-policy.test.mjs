import assert from "node:assert/strict";
import test from "node:test";
import { DEEP_LINK_SCHEME, isWorkspaceOpenUrl } from "../src/main/desktopDeepLinkUrl.ts";

test("Enntity deep links use an isolated scheme for callbacks and workspace opens", () => {
  assert.equal(DEEP_LINK_SCHEME, "enntity-zcode");
  assert.equal(isWorkspaceOpenUrl(new URL("enntity-zcode://workspace/open?path=%2Ftmp")), true);
  assert.equal(isWorkspaceOpenUrl(new URL("zcode://workspace/open?path=%2Ftmp")), false);
});
