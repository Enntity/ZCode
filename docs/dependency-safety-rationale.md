# Dependency safety update

## Scope and acceptance

This fork updates only dependency declarations, the pnpm resolution lockfile, and the Electron packaging version pin. The goal is to remove public npm advisories from shipped/runtime dependency paths wherever a patched release can be selected without crossing an incompatible major-version boundary. Electron moves to the supported stable 44.5.1 release, with native ABI metadata pinned to 4.36.0 and parent-owned native-module rebuild and packaged-app checks. Advisory exceptions without a patched release, or where the available fix requires a major/API transition, stay explicit for separate review.

## Resolution policy

- Prefer published patched versions confirmed in the npm registry.
- Pin Electron 44.5.1 and use the same exact version in its desktop manifest and electron-builder configuration.
- Raise direct dependencies where their declared semver permits the patched release; use root pnpm overrides for vulnerable transitive dependencies, scoped to compatible majors when multiple majors are in use.
- Preserve the existing AI SDK patches and constrain `@ai-sdk/provider-utils` only within each compatible major.
- Refresh only `pnpm-lock.yaml` with install scripts disabled. Do not run build, release, or native asset preparation in this dependency-only change.

## Validation boundary

The npm audit output is public dependency evidence. A refreshed production-only audit leaves 11 advisories across five module paths:

- `node-forge` (high): it remains a direct desktop runtime dependency, but source use in `packages/services/src/runtime-tools/appCaCert.ts` is limited to RSA key generation and certificate signing/serialization. A workspace search found no node-forge signature-verification call; the advisory's affected verification path is not reached by current application source. The advisory currently has no patched release.
- `packages/ui > shadcn > ... > body-parser` (low) and `brace-expansion` (seven moderate/high advisories): the package is referenced by `packages/ui/src/styles.css` for Tailwind's build-time CSS. Its audited nested MCP/Express and minimatch utilities are in the production dependency closure, but are tooling paths rather than UI runtime source imports. Available fixes cross major versions (body-parser 2.x, brace-expansion 5.x), so they remain pending compatibility review. The `braces` high-severity advisory has no patched version.
- `apps/zcode-cli/packages/debug > ... > uuid` (moderate): the path is the separate debug application, not the packaged desktop UI; the available fix crosses from uuid v3 to v11 and remains pending compatibility review.

The basic-ftp advisory was cleared by resolving the proxy-agent/get-uri FTP path to 6.2.1. Both locked get-uri versions (6.0.5 and 8.0.0) call only `Client.access`, `lastMod`, `list`, `downloadTo`, and `close`; those methods remain in basic-ftp 6.2.1. A synthetic import/FTP-flow check for both get-uri versions passed with mocked Client methods and no network sockets.

The final npm production audit returned 11 unique advisories (12 counted findings: 7 high, 4 moderate, 1 low) and no critical findings; the original supplied report had 214 total advisories. This is a production-lock audit result, not proof that every package is reachable from the shipped Electron bundle. Parent-owned install, typecheck, packaging, and final bundle reachability review remain separate integration checks.
