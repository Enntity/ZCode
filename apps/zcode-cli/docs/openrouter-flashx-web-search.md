# OpenRouter FlashX WebSearch

## Behavior and owner

The existing ZCode `WebSearch` tool can use OpenRouter's server-side web search for the Enntity LLooM GLM-5.3-FlashX route. ZCode's model adapter owns provider-specific request encoding; LLooM continues to own the upstream OpenRouter credential and request forwarding. The route is eligible only when all of these match: provider ID `enntity-lloom`, model ID `z-ai/glm-5.3-flashx`, API type `openai-chat-completions`, configured base URL `http://127.0.0.1:8100/v1`, and actual request URL `http://127.0.0.1:8100/v1/chat/completions`.

## Invariants

- The adapter marks only its internal provider-native `WebSearch` tool with a private sentinel function name, then replaces that exact single-tool request with OpenRouter's `openrouter:web_search` server tool.
- Search settings are fixed to Exa with one use, at most two results and two total results. The existing `allowed_domains` and `blocked_domains` inputs map to OpenRouter's `allowed_domains` and `excluded_domains`; unrelated client parameters are not forwarded.
- All other providers, models, endpoints, request paths, and ordinary function tools pass through unchanged. This adapter never connects directly to OpenRouter and sends no credentials.
- The model's existing `supportsNativeWebSearch` capability must be enabled only for the exact built-in LLooM/FlashX route. The adapter route checks remain a second fail-closed boundary.
- Returned URLs remain citations in ZCode's `WebSearch` output. Citation annotations must be preserved when available; otherwise Markdown links already present in the model summary remain the fallback.
- Provider errors continue through the existing fetch and model error adapters. Request cancellation and streaming semantics are unchanged.

## Acceptance scenarios

1. The exact provider/model/base URL/request path plus the private marker rewrites to one OpenRouter search server tool with fixed Exa limits and any validated domain filter.
2. Each route mismatch passes the body through byte-for-byte; a marker request with additional tools fails closed or remains untouched.
3. Ordinary function tools are not rewritten.
4. Synthetic OpenRouter `url_citation` annotations become source links in the existing normalized WebSearch result, and source-free Markdown summaries continue to produce links.
