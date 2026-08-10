# Agent Instructions for Leenk

## Package Manager

- Use the latest stable Nub release; do not pin the Nub CLI version.
- Install with `nub install --frozen-lockfile`; `nub.lock` is the only lockfile.

## Commands

| Task                 | Command                |
| -------------------- | ---------------------- |
| Development server   | `nub run dev`          |
| Production build     | `nub run build`        |
| TypeScript check     | `nub run check`        |
| Unit tests           | `nub run test`         |
| Lint                 | `nub run lint`         |
| Format check         | `nub run format:check` |
| Full verification    | `nub run verify`       |
| Alchemy plan         | `nub run plan`         |
| Deploy (Development) | `nub run deploy`       |
| Deploy (Production)  | `nub run deploy:prod`  |

- Oxfmt does not format `.astro`; Astro's compiler/build validates those files.
- `nub run quality` mutates files; use the read-only commands for audits and CI.
- Never run `nub run deploy:prod` without explicit production-deployment
  approval. The Development deploy is the default `nub run deploy`.

## Architecture

- Astro 7 with server-side rendering and React islands.
- Cloudflare Workers deployment via Alchemy (`alchemy.run.ts`) with the
  `@distilled.cloud/astro` adapter. Local builds use `astro.config.local.ts`;
  Wrangler is not used.
- Tailwind CSS 4 with the typography plugin.
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
