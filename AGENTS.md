# Agent Instructions for Leenk

## Package Manager

- Use the latest stable Bun release. The current stable is 1.4.0.
- Install with `bun install --frozen-lockfile`; `bun.lock` is the only
  lockfile.
- Do not add npm, pnpm, yarn, or Nub lockfiles. Local install and verify
  must not require Node.js.
- ScriptC talks to TypeScript 7's native sync API. Bun 1.4.0 does not
  expose `child_process` pipe `_handle.fd` (oven-sh/bun#39747), so the
  repo patches `typescript@7.0.2` to use POSIX fifos on Bun. Do not drop
  `patches/typescript@7.0.2.patch` until that Bun gap is gone.
- `extract-zip` has no upstream fix for GHSA-jmr9-qjv8-65gv. The local
  copy in `vendor/extract-zip` is the override. Do not re-add
  `--ignore GHSA-jmr9-qjv8-65gv`.

## Commands

| Task                 | Command                |
| -------------------- | ---------------------- |
| Development server   | `bun run dev`          |
| Production build     | `bun run build`        |
| TypeScript check     | `bun run check`        |
| Unit tests           | `bun run test`         |
| Lint                 | `bun run lint`         |
| Format check         | `bun run format:check` |
| Full verification    | `bun run verify`       |
| Alchemy plan         | `bun run plan`         |
| Deploy (Development) | `bun run deploy`       |
| Deploy (Production)  | `bun run deploy:prod`  |

- Oxfmt does not format `.astro`; Astro's compiler/build validates those files.
- `bun run quality` mutates files; use the read-only commands for audits and CI.
- Never run `bun run deploy:prod` without explicit production-deployment
  approval. The Development deploy is the default `bun run deploy`.

## Architecture

- Astro 7 with server-side rendering and React islands.
- Cloudflare Workers deployment via Alchemy (`alchemy.run.ts`) with the
  `@distilled.cloud/astro` adapter. A single `astro.config.ts` serves dev,
  build, and deploy: `bun run dev` and `bun run build` set
  `LEENK_LOCAL_ADAPTER=1` to add the adapter locally, while `alchemy deploy`
  leaves it unset and injects its own adapter. Wrangler is not used.
- The Worker still sets `nodejs_compat` for the Cloudflare runtime. That is
  not a local Node.js toolchain requirement.
- StyleX 0.19 via `@stylexjs/unplugin` on Vite. Official StyleX does not
  compile `.astro` templates, so React islands own StyleX styles and a
  small global CSS layer covers tokens, typeset, skip links, and the
  Operator dashboard sidebar state machine. Extracted StyleX CSS is
  appended to `src/styles/stylex.css` and loaded on every HTML shell;
  `bun run dev` also links `/virtual:stylex.css`.
- TypeScript 7, Oxlint, Oxfmt, Vitest, and Husky/lint-staged.
- Cloudflare Web Analytics is injected at the edge for page/performance telemetry; the separate `SITE_ANALYTICS` Workers Analytics Engine binding records only bounded, privacy-preserving engagement, error, and authenticated lifecycle events. Social links use `social_link_clicked` with a bounded network dimension.
- Plus Jakarta Sans is self-hosted locally.

## Repository Layout

- Routes: `src/pages/`
- Shared layout: `src/layouts/`
- React components: `src/components/`
- Static assets: `public/`
- Generated and ignored: `.astro/`, `.wrangler/`, `dist/`, `node_modules/`

## External References

| Need                    | File          |
| ----------------------- | ------------- |
| Setup and deployment    | `README.md`   |
| Vulnerability reporting | `SECURITY.md` |
