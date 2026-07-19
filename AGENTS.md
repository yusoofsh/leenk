# Agent Instructions for Leenk

## Package Manager

- Use the latest stable Nub release; do not pin the Nub CLI version.
- Install with `nub install --frozen-lockfile`; `nub.lock` is the only lockfile.

## Commands

| Task                   | Command                |
| ---------------------- | ---------------------- |
| Development server     | `nub run dev`          |
| Production build       | `nub run build`        |
| Local Worker preview   | `nub run preview`      |
| TypeScript check       | `nub run check`        |
| Unit tests             | `nub run test`         |
| Lint                   | `nub run lint`         |
| Format check           | `nub run format:check` |
| Wrangler binding types | `nub run types:check`  |
| Full verification      | `nub run verify`       |

- Oxfmt does not format `.astro`; Astro's compiler/build validates those files.
- `nub run quality` mutates files; use the read-only commands for audits and CI.
- Never run `nub run deploy` without explicit production-deployment approval.

## Architecture

- Astro 7 with server-side rendering and React islands.
- Cloudflare Workers deployment via `@astrojs/cloudflare` and `wrangler.jsonc`.
- Tailwind CSS 4 with the typography plugin.
- TypeScript 7, Oxlint, Oxfmt, Vitest, and Husky/lint-staged.
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
