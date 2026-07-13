# Leenk

A minimalist personal portfolio for Yusoof Moh, built with Astro and deployed as a Cloudflare Worker.

## Stack

- Astro 7 with server-side rendering
- React 19 islands
- Tailwind CSS 4 and typography styles
- Cloudflare Workers through `@astrojs/cloudflare` and Wrangler
- TypeScript, ESLint, Prettier, Husky, and lint-staged
- Simple Analytics and a self-hosted Plus Jakarta Sans font

## Requirements

- Bun 1.3.14
- Node.js 22.12.0 or newer

The repository uses `bun.lock` as its only package-manager lockfile.

## Development

```bash
bun install --frozen-lockfile
bun run dev
```

The development server is available at <http://localhost:4321> by default.

## Commands

| Task                               | Command                |
| ---------------------------------- | ---------------------- |
| Start the Astro development server | `bun run dev`          |
| Build the production Worker        | `bun run build`        |
| Preview through Wrangler           | `bun run preview`      |
| Run Astro and TypeScript checks    | `bun run check`        |
| Run ESLint                         | `bun run lint`         |
| Check formatting                   | `bun run format:check` |
| Check generated Wrangler types     | `bun run types:check`  |
| Run all local verification gates   | `bun run verify`       |
| Apply lint and formatting fixes    | `bun run quality`      |

There is no separate test suite. CI runs linting, formatting, Astro/TypeScript checks, the production build, and a high-severity dependency audit.

## Project Structure

```text
src/
├── components/        React islands and visual components
├── layouts/           Shared document layout and metadata
├── lib/               Stores and utilities
├── pages/             Astro routes and social redirects
└── styles/            Global Tailwind styles

public/                Static assets copied into the Worker bundle
wrangler.jsonc         Cloudflare Worker and static-assets configuration
```

## Deployment

The build produces an Astro server entry point and static assets in `dist/`. Preview the exact Worker configuration locally before deploying:

```bash
bun run build
bun run preview
```

Production deployment is intentionally explicit:

```bash
bun run deploy
```

Deploy only after local and CI verification pass. The deploy command changes production state and requires separate approval when run by an agent.

## Contributing

1. Create a short-lived branch.
2. Make a focused change.
3. Run `bun run verify`.
4. Commit with a conventional commit message.
5. Open a pull request and wait for CI.

## Security

Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

## License

This project is private and is not currently licensed for public use.
