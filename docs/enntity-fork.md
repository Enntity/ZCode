# Enntity ZCode fork

## Product rules

The fork keeps ZCode's coding agent, browser, plugin, MCP, tool, local-workspace,
and remote-workspace features. Its product identity is Enntity ZCode, and all
managed application data, CLI configuration, provider configuration, and
credentials use an Enntity-specific root by default. Existing upstream ZCode
settings and credentials are never imported automatically.
The desktop starts directly into the local workspace rather than requiring a
ZCode account. Z.ai/BigModel login entry points are hidden in the Enntity UI;
custom providers remain available from Model Providers settings. The sidebar
guest entry is labeled “Local models” and keeps its normal preferences menu.
Dynamic workflows are enabled locally by default and honor the existing
`ZCODE_DYNAMIC_WORKFLOW_MODE` override; no vendor rollout or subscription state
is consulted. Other vendor client metadata remains absent, including coding
plan catalogs, purchase previews, and update-rollout metadata; the fork does not
invent billing or entitlement state.

The default model provider is local LLooM's OpenAI-compatible API at
`http://127.0.0.1:8100/v1`, which passes requests through to OpenRouter's
verified `z-ai/glm-5.3-flashx` route. Its selection starts with reasoning effort
`low`, allows `high` and `max`, and supplies WebSearch through OpenRouter server tools on this exact local route. There is
no cloud or alternate-model fallback. Users may choose another model exposed by
LLooM.

The fork sends no managed requests to Z.ai, BigModel, Zhipu, ChatGLM, or Aminer
hosts. A centralized, early outbound guard blocks those vendor host suffixes
across application-managed desktop and Node networking, including explicit
endpoint overrides and redirects. Managed CLI Chromium uses direct networking
with host-resolver rules that deny the known vendor suffixes, including
redirects; HTTP and WebSocket route handlers also block direct vendor requests.
It does not inherit system proxy settings, because a proxy could resolve those
hosts outside Chromium's resolver policy. The desktop embedded browser and API
proxy configuration remain supported independently. Loopback LLooM and
unrelated or user-selected destinations remain available. This is a known-host
policy, not an OS firewall: unlisted IP literals, DNS aliases, arbitrary
commands, MCP servers, plugins, and user-launched programs remain outside its
coverage.

The fork retains local coding, bundled skills, browser automation, NodeREPL,
MCP, and remote-workspace support. The public CUA package is only a stub in this
checkout. Vendor-backed document/PDF/PPTX/XLSX, image-search, vendor accounts,
conversation sharing, and the upstream plugin marketplace are unavailable
until Enntity-owned replacements exist; no mismatched LLooM endpoint is used as
a substitute for web or media search.

Product telemetry, crash reporting, automatic update checks, provider-registry
sync/import, and model request/response retention are disabled for the fork.
Vendor-hosted client scenes and desktop rollout configuration are not fetched;
the scenes API returns an empty local catalog, and community/feedback links use
the Enntity GitHub repository. Ordinary local diagnostics remain available.
Packaging builds use official
Electron and builder artifact sources and do not publish artifacts.

## Ownership and boundaries

The shared environment/product-flavor resolver owns fork flavor selection.
Desktop packaging and runtime derive product identity from that resolver.
Desktop's early bootstrap installs the network guard before application
bootstraps or windows. The CLI's early runtime boundary installs the same host
policy before provider or plugin initialization. Existing provider config
adapters own configuration persistence; they resolve defaults under the fork
data root and do not import upstream account state. Existing telemetry and
updater owners expose hard-disabled behavior for this flavor.

No new independent session, provider, or telemetry state is introduced. The
fork uses the existing OpenAI-compatible provider adapter and ordinary
provider-selection flow.

## Acceptance cases

- Production and preview build identity cannot bypass the Enntity fork flavor;
  its app ID, display name, deep link scheme (`enntity-zcode`), CLI config, and runtime data paths are
  distinct from upstream.
- A vendor URL is denied case-insensitively for the exact host and all
  subdomains, including a trailing dot. Redirects are re-evaluated. Loopback
  and unrelated hosts are allowed.
- Known vendor endpoint environment overrides cannot route managed requests
  around the host policy.
- Telemetry, crash reporting, update checks, remote provider sync/import, and
  model IO retention are disabled for the fork.
- The built-in provider is local LLooM with verified OpenRouter Flash X routing,
  low reasoning by default, and OpenRouter WebSearch; other LLooM models remain
  selectable.
- Desktop and CLI data/config defaults stay under the Enntity ZCode root and
  never inherit upstream credentials or configuration.
- Packaging continues to support local macOS arm64 builds and has no upload or
  publish side effect.
- The CLI's headless permission default remains approval-oriented (`edit`), not
  automatic approval.

## Local macOS build

The Apple silicon desktop build requires macOS 13 or newer. Electron is pinned to 44.5.1. A local development signature is used when available; artifacts are not notarized or uploaded.

WebSearch uses OpenRouter Exa search through LLooM and retains source links. It is bounded to one search and two results per invocation; no additional search key is stored in ZCode. See the CLI search integration spec for route and domain-filter constraints.
