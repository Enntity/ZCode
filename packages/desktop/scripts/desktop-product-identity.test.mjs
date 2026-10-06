import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDesktopProductFlavor,
  resolveDesktopProductIdentity,
  resolveWindowsAppUserModelIdForFlavor,
} from "./desktop-product-identity.mjs";

test("fork identity is fixed and isolated from upstream environment overrides", () => {
  const env = { ZCODE_ENV: "production", ZCODE_PREVIEW_IDENTITY: "1" };
  assert.equal(resolveDesktopProductFlavor(env), "enntity");
  assert.deepEqual(resolveDesktopProductIdentity(env), {
    flavor: "enntity",
    appId: "com.enntity.zcode",
    productName: "Enntity ZCode",
    linuxExecutableName: "enntity-zcode",
    linuxPackageName: "enntity-zcode",
    cuaHelperInstallVariant: null,
  });
  assert.equal(
    resolveWindowsAppUserModelIdForFlavor("enntity", { isPackaged: false }),
    "com.enntity.zcode",
  );
});
