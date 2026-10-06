import type { BrowserContext } from "playwright-core";
import { BLOCKED_VENDOR_DOMAIN_SUFFIXES, isBlockedVendorUrl } from "@zcode/shared";

export function buildManagedBrowserVendorResolverRules(): string[] {
  return BLOCKED_VENDOR_DOMAIN_SUFFIXES.flatMap((domain) => {
    return [domain, `*.${domain}`, `${domain}.`, `*.${domain}.`].map(
      (host) => `MAP ${host} ~NOTFOUND`,
    );
  });
}

/** Blocks direct vendor requests in the managed browser context. */
export async function installManagedBrowserVendorPolicy(
  context: Pick<BrowserContext, "route" | "routeWebSocket">,
): Promise<void> {
  await context.route("**/*", async (route) => {
    if (isBlockedVendorUrl(route.request().url())) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  await context.routeWebSocket(() => true, async (webSocketRoute) => {
    if (isBlockedVendorUrl(webSocketRoute.url())) {
      await webSocketRoute.close({ code: 1008, reason: "Blocked vendor destination" });
      return;
    }
    webSocketRoute.connectToServer();
  });
}
