import assert from "node:assert/strict";
import test from "node:test";
import type { Dispatcher } from "undici";
import { createHostApiNetworkTransport } from "./nodeApiNetwork.js";

test("custom Undici dispatchers reject vendor redirect origins before forwarding", async () => {
  const forwardedHosts: string[] = [];
  const dispatcher = {
    dispatch(options: Dispatcher.DispatchOptions) {
      const target = new URL(options.path, options.origin);
      forwardedHosts.push(target.hostname);
      return true;
    },
    close: async () => {},
    destroy: async () => {},
  } as unknown as Dispatcher;
  const transport = createHostApiNetworkTransport(
    async () => ({ httpProxy: "http://127.0.0.1:8080" }),
    {
      createDispatcher: async () => dispatcher,
      fetchWithDispatcher: async (input, init) => {
        const requestUrl = new URL(input);
        init.dispatcher.dispatch(
          { origin: requestUrl.origin, path: requestUrl.pathname, method: "GET" },
          {} as Dispatcher.DispatchHandlers,
        );
        init.dispatcher.dispatch(
          { origin: "https://api.z.ai", path: "/redirect-target", method: "GET" },
          {} as Dispatcher.DispatchHandlers,
        );
        return new Response("should not arrive");
      },
    },
  );

  await assert.rejects(transport.fetch("https://example.org/start"), /blocks managed requests/u);
  assert.deepEqual(forwardedHosts, ["example.org"]);
  await transport.disposeAndWait();
});
