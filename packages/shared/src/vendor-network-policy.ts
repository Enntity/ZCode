const BLOCKED_VENDOR_DOMAIN_SUFFIXES = [
  "z.ai",
  "bigmodel.cn",
  "bigmodel.com",
  "zhipuai.cn",
  "zhipuai.com",
  "zhipu.cn",
  "zhipu.ai",
  "zhipu-ai.feishu.cn",
  "zcode.ai",
  "chatglm.cn",
  "aminer.cn",
] as const;

/** True for a known Z.ai/BigModel/Zhipu/ChatGLM/Aminer host or any subdomain. */
export function isBlockedVendorHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.+$/u, "");
  return BLOCKED_VENDOR_DOMAIN_SUFFIXES.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

/** Malformed URLs fail closed so endpoint overrides cannot bypass the policy. */
export function isBlockedVendorUrl(value: string | URL): boolean {
  try {
    return isBlockedVendorHost(new URL(value).hostname);
  } catch {
    return true;
  }
}
