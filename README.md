# Leenk

A minimalist personal portfolio for Yusoof Moh, built with Astro and deployed as a Cloudflare Worker.

## Stack

- Astro 7 with server-side rendering
- React 19 islands
- Tailwind CSS 4 and typography styles
- Cloudflare Workers through `@astrojs/cloudflare` and Wrangler
- TypeScript 7, Oxlint, Oxfmt, Husky, and lint-staged
- Vite 8 with Rolldown and Vitest 4
- Simple Analytics and a self-hosted Plus Jakarta Sans font

## Requirements

- Nub 0.2.10
- Node.js 26.5.0 or newer

The repository uses Nub's `lock.yaml` as its only package-manager lockfile.

## Development

```bash
nub install --frozen-lockfile
nub run dev
```

The development server is available at <http://localhost:4321> by default.

## Commands

| Task                               | Command                |
| ---------------------------------- | ---------------------- |
| Start the Astro development server | `nub run dev`          |
| Build the production Worker        | `nub run build`        |
| Preview through Wrangler           | `nub run preview`      |
| Run the TypeScript check           | `nub run check`        |
| Run unit tests                     | `nub run test`         |
| Run Oxlint                         | `nub run lint`         |
| Check Oxfmt formatting             | `nub run format:check` |
| Check generated Wrangler types     | `nub run types:check`  |
| Run all local verification gates   | `nub run verify`       |
| Apply lint and formatting fixes    | `nub run quality`      |

Oxfmt formats supported JavaScript, TypeScript, CSS, Markdown, and configuration files. It currently skips `.astro` files, which remain validated by Astro's compiler and production build. CI runs linting, formatting, TypeScript checks, unit tests, the production build, and a high-severity dependency audit.

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
nub run build
nub run preview
```

Production deployment is intentionally explicit:

```bash
nub run deploy
```

Deploy only after local and CI verification pass. The deploy command changes production state and requires separate approval when run by an agent.

## Contributing

1. Create a short-lived branch.
2. Make a focused change.
3. Run `nub run verify`.
4. Commit with a conventional commit message.
5. Open a pull request and wait for CI.

## Security

Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

## License

This project is private and is not currently licensed for public use.
