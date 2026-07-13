# Agent Instructions for Leenk

## Package Manager

- Use Bun 1.3.14, pinned by `packageManager` and `bun.lock`.
- Install with `bun install --frozen-lockfile`; do not create another lockfile.

## Commands

| Task                   | Command                |
| ---------------------- | ---------------------- |
| Development server     | `bun run dev`          |
| Production build       | `bun run build`        |
| Local Worker preview   | `bun run preview`      |
| Type and Astro checks  | `bun run check`        |
| Lint                   | `bun run lint`         |
| Format check           | `bun run format:check` |
| Wrangler binding types | `bun run types:check`  |
| Full verification      | `bun run verify`       |

- No test suite is configured; use the full verification gate and focused runtime checks.
- `bun run quality` mutates files; use the read-only commands for audits and CI.
- Never run `bun run deploy` without explicit production-deployment approval.

## Architecture

- Astro 7 with server-side rendering and React islands.
- Cloudflare Workers deployment via `@astrojs/cloudflare` and `wrangler.jsonc`.
- Tailwind CSS 4 with the typography plugin.
- Strict TypeScript, ESLint accessibility rules, Prettier, and Husky/lint-staged.
- Simple Analytics and a local Plus Jakarta Sans font.

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
