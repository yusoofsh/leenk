# Agent Instructions for Leenk

## Build/Lint/Test Commands

- **Build**: `npm run build` or `astro build`
- **Dev server**: `npm run dev` or `astro dev`
- **Preview**: `npm run preview` or `astro preview`
- **Code quality**: `npm run quality` or `eslint --fix . && prettier --write .`
- **No tests configured** - this is a static site with no test suite

## Architecture

- **Framework**: Astro 5.x with server-side rendering
- **Adapter**: Cloudflare Pages (@astrojs/cloudflare)
- **Styling**: Tailwind CSS v4 with @tailwindcss/typography
- **Language**: TypeScript with strictest config
- **Analytics**: SimpleAnalytics plugin
- **Font**: Plus Jakarta Sans via astro-font

## Code Style Guidelines

- **Imports**: Use natural sorting (perfectionist ESLint plugin)
- **Formatting**: Prettier with Astro, Tailwind, and package.json plugins
- **Linting**: ESLint with TypeScript recommended + stylistic rules, JSX accessibility
- **Commits**: Conventional commits (feat, fix, docs, chore, etc.)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error handling**: TypeScript strict mode enforces proper error handling
- **File structure**: src/pages/ for routes, src/layouts/ for layouts, public/ for static assets
