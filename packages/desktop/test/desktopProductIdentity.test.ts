import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  desktopProductIdentities,
  resolveDesktopArtifactSuffix,
  resolveDesktopProductFlavor,
  resolveWindowsAppUserModelId,
  resolveWindowsAppUserModelIdForFlavor,
  resolveDesktopProductIdentity,
} from "../scripts/desktop-product-identity.mjs";

describe("desktop product identity", () => {
  it("根锁文件的发布版本与构建版本一致", () => {
    // 合并上游发布提交只对齐当前版本，不恢复上游旧版本，也不重算依赖锁。
    const readRootJson = (name: string) =>
      JSON.parse(readFileSync(resolve(import.meta.dirname, "../../..", name), "utf8"));
    const version = readRootJson("package.json").version;
    const lock = readRootJson("package-lock.json");
    expect(lock.version).toBe(version);
    expect(lock.packages[""].version).toBe(version);
  });

  it("Enntity 构建恒为 enntity 身份，后端环境无法改写产品身份", () => {
    // 身份与后端环境分轴：ZCODE_ENV 只决定后端与产物后缀，不决定 App 身份。
    for (const env of [
      { ZCODE_ENV: "test" },
      { ZCODE_ENV: "production" },
      {},
      { ZCODE_ENV: "staging" },
    ]) {
      expect(resolveDesktopProductFlavor(env)).toBe("enntity");
      expect(resolveDesktopProductIdentity(env)).toBe(desktopProductIdentities.enntity);
    }
    expect(desktopProductIdentities.enntity).toEqual({
      flavor: "enntity",
      appId: "com.enntity.zcode",
      productName: "Enntity ZCode",
      linuxExecutableName: "enntity-zcode",
      linuxPackageName: "enntity-zcode",
      cuaHelperInstallVariant: null,
    });
  });

  it("上游 Preview 身份开关无法让 Enntity 构建改用 Preview 身份", () => {
    // 打包策略验收：production/preview 构建不能绕过 enntity flavor。
    for (const flag of ["1", " 1 ", "", "0"]) {
      const env = { ZCODE_ENV: "production", ZCODE_PREVIEW_IDENTITY: flag };
      expect(resolveDesktopProductFlavor(env)).toBe("enntity");
    }
  });

  it("产物后缀只标记后端环境，生产后端的包靠 productName 区分", () => {
    expect(resolveDesktopArtifactSuffix({ ZCODE_ENV: "test" })).toBe("_TEST");
    expect(resolveDesktopArtifactSuffix({ ZCODE_ENV: "production" })).toBe("");
    expect(
      resolveDesktopArtifactSuffix({ ZCODE_ENV: "production", ZCODE_PREVIEW_IDENTITY: "1" }),
    ).toBe("");
    expect(resolveDesktopArtifactSuffix({})).toBe("_TEST");
  });

  it("打包态 Windows AUMID 必须和 NSIS appId 保持一致", () => {
    expect(resolveWindowsAppUserModelId({ ZCODE_ENV: "production" })).toBe(
      desktopProductIdentities.enntity.appId,
    );
    expect(resolveWindowsAppUserModelId({ ZCODE_ENV: "test" })).toBe(
      desktopProductIdentities.enntity.appId,
    );
    // 主进程按编译期 flavor 取 AUMID，不依赖安装后机器上的环境变量。
    expect(resolveWindowsAppUserModelIdForFlavor("enntity")).toBe(
      desktopProductIdentities.enntity.appId,
    );
  });

  it("开发态继续使用独立 AUMID，避免污染打包版 Shell 身份", () => {
    expect(resolveWindowsAppUserModelId({}, { isPackaged: false })).toBe("com.enntity.zcode");
  });
});
