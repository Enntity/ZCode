import { app, session, shell, type Session } from "electron";
import { isBlockedVendorUrl } from "@zcode/shared";
import { installNodeVendorNetworkGuard } from "@zcode/shared/node";

installNodeVendorNetworkGuard();

function installVendorBlock(target: Session): void {
  target.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
    (details, callback) => {
      callback(isBlockedVendorUrl(details.url) ? { cancel: true } : {});
    },
  );
}

// Each Electron session owns its request filter. Redirect requests pass through
// onBeforeRequest again, so a permitted origin cannot redirect to a blocked host.
app.on("session-created", installVendorBlock);
void app.whenReady().then(() => installVendorBlock(session.defaultSession));

const originalOpenExternal = shell.openExternal.bind(shell);
shell.openExternal = async (url, options) => {
  if (isBlockedVendorUrl(url))
    throw new Error("Enntity ZCode blocks external navigation to this vendor.");
  return originalOpenExternal(url, options);
};
