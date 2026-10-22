import { describe, expect, it } from "vitest";
import { IGenUiService } from "./contract.js";
import { exampleGenUiPrepare } from "./contract.example.js";

describe("gen-ui contract", () => {
  it("keeps the service descriptor channel name stable", () => {
    // RPC 通道名是跨进程契约的一部分；改名会同时破坏 desktop 主进程与 host 的握手。
    expect(IGenUiService.channelName).toBe("gen-ui");
  });

  it("keeps the prepare example aligned with the contract target fields", () => {
    // 示例承载 GenUiStateTarget 的定位字段与沙箱准备参数；缺字段会在服务实现里静默退化。
    expect(exampleGenUiPrepare).toMatchObject({
      workspacePath: expect.any(String),
      sessionId: expect.any(String),
      path: expect.any(String),
      html: expect.any(String),
      ownerWebContentsId: expect.any(Number),
      instanceKey: expect.any(String),
    });
  });
});
