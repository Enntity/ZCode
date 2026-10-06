import http from "node:http";
import https from "node:https";
import net from "node:net";
import { syncBuiltinESMExports } from "node:module";
import tls from "node:tls";
import { isBlockedVendorHost, isBlockedVendorUrl } from "../vendor-network-policy.js";

const BLOCKED_REQUEST_MESSAGE = "Enntity ZCode blocks managed requests to this vendor host.";
let installed = false;

function assertAllowedHost(host: string | undefined): void {
  if (!host) return;
  const normalized = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host;
  if (isBlockedVendorHost(normalized)) throw new TypeError(BLOCKED_REQUEST_MESSAGE);
}

function targetFromHttpArguments(args: unknown[]): void {
  const [target, second] = args;
  const options =
    second && typeof second === "object"
      ? (second as { hostname?: unknown; host?: unknown; headers?: unknown })
      : target && typeof target === "object" && !(target instanceof URL)
        ? (target as { hostname?: unknown; host?: unknown; headers?: unknown })
        : undefined;
  if (target instanceof URL) assertAllowedHost(target.hostname);
  else if (typeof target === "string" && /^[a-z][a-z\d+.-]*:\/\//iu.test(target)) {
    try {
      assertAllowedHost(new URL(target).hostname);
    } catch {
      throw new TypeError(BLOCKED_REQUEST_MESSAGE);
    }
  }
  const headers = options?.headers;
  const hostHeader =
    headers && typeof headers === "object"
      ? Object.entries(headers as Record<string, unknown>).find(
          ([key]) => key.toLowerCase() === "host",
        )?.[1]
      : undefined;
  for (const candidate of [hostHeader, options?.hostname, options?.host]) {
    if (typeof candidate === "string") {
      assertAllowedHost(candidate.replace(/^\[([^\]]+)\](?::\d+)?$/u, "$1").split(":")[0]);
    }
  }
  const method =
    options && typeof options === "object" ? (options as { method?: unknown }).method : undefined;
  const path =
    options && typeof options === "object" ? (options as { path?: unknown }).path : undefined;
  if (method === "CONNECT" && typeof path === "string") {
    assertAllowedHost(path.replace(/^\[([^\]]+)\](?::\d+)?$/u, "$1").split(":")[0]);
  }
}

function socketHost(args: unknown[]): string | undefined {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const target = normalized[0];
  if (target && typeof target === "object") {
    const options = target as { hostname?: unknown; host?: unknown; servername?: unknown };
    for (const host of [options.hostname, options.host, options.servername]) {
      if (typeof host === "string") assertAllowedHost(host);
    }
    return undefined;
  }
  return typeof target === "number" && typeof normalized[1] === "string"
    ? normalized[1]
    : undefined;
}

function tlsHost(args: unknown[]): string | undefined {
  if (typeof args[0] === "number" && typeof args[1] === "string") return args[1];
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue;
    const options = arg as { hostname?: unknown; host?: unknown; servername?: unknown };
    for (const host of [options.servername, options.hostname, options.host]) {
      if (typeof host === "string") assertAllowedHost(host);
    }
  }
  return undefined;
}

/** Installs process-wide HTTP, TLS, socket, fetch, redirect, and proxy host guards. */
export function installNodeVendorNetworkGuard(): void {
  if (installed) return;
  installed = true;

  const originalSocketConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (
    this: net.Socket,
    ...args: Parameters<typeof originalSocketConnect>
  ) {
    assertAllowedHost(socketHost(args));
    return Reflect.apply(originalSocketConnect, this, args) as ReturnType<
      typeof originalSocketConnect
    >;
  } as typeof net.Socket.prototype.connect;

  const originalTlsConnect = tls.connect;
  tls.connect = ((...args: unknown[]) => {
    assertAllowedHost(tlsHost(args));
    return Reflect.apply(originalTlsConnect, tls, args) as ReturnType<typeof originalTlsConnect>;
  }) as typeof tls.connect;

  for (const module of [http, https]) {
    const originalRequest = module.request;
    module.request = ((...args: unknown[]) => {
      targetFromHttpArguments(args);
      return Reflect.apply(originalRequest, module, args) as ReturnType<typeof module.request>;
    }) as typeof module.request;
    const originalGet = module.get;
    module.get = ((...args: unknown[]) => {
      targetFromHttpArguments(args);
      return Reflect.apply(originalGet, module, args) as ReturnType<typeof module.get>;
    }) as typeof module.get;
  }
  syncBuiltinESMExports();

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const target = input instanceof Request ? input.url : String(input);
    if (isBlockedVendorUrl(target)) throw new TypeError(BLOCKED_REQUEST_MESSAGE);
    return nativeFetch(input, init);
  };
}
