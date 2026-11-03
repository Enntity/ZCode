# Dependency safety update

## Scope and acceptance

This note records the production dependency audit and focused dependency adjustments for the Enntity ZCode fork. The goal is to remove advisory-bearing tooling paths from the shipped/runtime dependency closure where their packages are only needed during development, while retaining explicit exceptions for unresolved runtime paths. Electron is pinned to 44.7.0, with native ABI metadata pinned to 4.37.0 and parent-owned native-module rebuild and packaged-app checks.

## Resolution policy

- Prefer published patched versions confirmed in the npm registry.
- Pin Electron 44.7.0 and use the same exact version in its desktop manifest and electron-builder configuration.
- Raise direct dependencies where their declared semver permits the patched release; use root pnpm overrides for vulnerable transitive dependencies, scoped to compatible majors when multiple majors are in use.
- Preserve the existing AI SDK patches and constrain `@ai-sdk/provider-utils` only within each compatible major.
- Keep `shadcn` as a `packages/ui` development dependency: it is used by Tailwind while building private UI CSS, and has no runtime JavaScript imports. This keeps its CLI, MCP/Express, and minimatch tree out of the production closure without removing CSS build support.
- Refresh only `pnpm-lock.yaml` with install scripts disabled. Do not run build, release, or native asset preparation in this dependency-only change.

## Validation boundary

The fresh production-only audit leaves 2 unique advisories across 2 dependency paths, reported as 3 counted findings:

- `node-forge` (one high finding): it remains a direct desktop runtime dependency, but source use in `packages/services/src/runtime-tools/appCaCert.ts` is limited to RSA key generation and certificate signing/serialization. A workspace search found no node-forge signature-verification call; the advisory's affected verification path is not reached by current application source. The advisory currently has no patched release.
- `apps/zcode-cli/packages/debug > ... > uuid` (two moderate findings): the separate debug application resolves uuid 9.0.1 through `http-mitm-proxy` and 11.1.0 through `vis-timeline`. The patched release is 11.1.1; the first path needs a major-version upgrade and remains pending isolated compatibility review. These paths are not part of the packaged desktop UI.

The `shadcn` CLI path no longer appears in the production audit because it is a build-time UI dependency. `packages/ui/src/styles.css` continues to resolve it from development dependencies; it is not imported by runtime JavaScript or shipped as an application runtime dependency.

The basic-ftp advisory was cleared by resolving the proxy-agent/get-uri FTP path to 6.2.1. Both locked get-uri versions (6.0.5 and 8.0.0) call only `Client.access`, `lastMod`, `list`, `downloadTo`, and `close`; those methods remain in basic-ftp 6.2.1. A synthetic import/FTP-flow check for both get-uri versions passed with mocked Client methods and no network sockets.

The final npm production audit returned 2 unique advisories (3 counted findings: 1 high and 2 moderate), with 0 critical and 0 low findings. This is a production-lock audit result, not proof that every package is reachable from the shipped Electron bundle. Parent-owned typecheck, packaging, and final bundle reachability review remain separate integration checks.
