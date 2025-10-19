# Leenk

[![Astro](https://img.shields.io/badge/Astro-5.1.5-000000?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.14-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

A modern, minimalist personal portfolio website built with Astro, showcasing the work and interests of Yusoof Moh, a full-stack engineer based in Indonesia.

## 🌟 Features

- **Server-Side Rendering**: Built with Astro for optimal performance and SEO
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Support**: Automatic theme detection based on system preferences
- **Type-Safe**: Full TypeScript implementation with strict configuration
- **Accessibility**: WCAG compliant with JSX accessibility linting
- **Analytics**: Privacy-focused tracking with SimpleAnalytics
- **Social Integration**: Direct links to GitHub, Twitter, and LinkedIn profiles
- **Custom Typography**: Plus Jakarta Sans font for enhanced readability

## 🛠️ Tech Stack

- **Framework**: [Astro 5.x](https://astro.build/) - Static site generator with SSR
- **Language**: [TypeScript 5.3](https://www.typescriptlang.org/) - Type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [@tailwindcss/typography](https://github.com/tailwindlabs/tailwindcss-typography)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) with [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- **Analytics**: [SimpleAnalytics](https://simpleanalytics.com/) - Privacy-focused
- **Font Loading**: [astro-font](https://github.com/radix-ui/astro-font) for optimal performance
- **Code Quality**:
  - ESLint with TypeScript and accessibility rules
  - Prettier with Astro, Tailwind, and package.json plugins
  - Husky pre-commit hooks with lint-staged

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yusoofsh/leenk.git
cd leenk
```

2. Install dependencies:

```bash
npm install
# or
bun install
```

3. Start the development server:

```bash
npm run dev
# or
bun run dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser.

## 📜 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally
- `npm run quality` - Run ESLint and Prettier to fix code quality issues

## 🏗️ Project Structure

```
src/
├── layouts/
│   └── index.astro          # Main layout with analytics and font loading
├── pages/
│   ├── index.astro          # Homepage with personal introduction
│   ├── 404.astro            # 404 error page
│   ├── github.ts            # GitHub profile redirect
│   ├── twitter.ts           # Twitter profile redirect
│   └── linkedin.ts          # LinkedIn profile redirect
└── env.d.ts                 # TypeScript environment declarations

public/
└── fonts/                   # Custom font files
```

## 🚀 Deployment

This site is configured for deployment on Cloudflare Pages:

1. Connect your GitHub repository to Cloudflare Pages
2. Set the build command to: `npm run build`
3. Set the build output directory to: `dist`
4. Deploy!

The site uses Cloudflare's image optimization and is configured for server-side rendering.

## 🤝 Contributing

While this is a personal portfolio site, contributions for bug fixes and improvements are welcome:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and run `npm run quality`
4. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is private and not currently licensed for public use.

## 📞 Contact

Yusoof Moh - [me@yusoofsh.id](mailto:me@yusoofsh.id)

- **Email**: [me@yusoofsh.id](mailto:me@yusoofsh.id)
- **Twitter**: [/twitter](https://leenk.pages.dev/twitter)
- **LinkedIn**: [/linkedin](https://leenk.pages.dev/linkedin)
- **GitHub**: [/github](https://leenk.pages.dev/github)

---

_Built with ❤️ in Malang, Indonesia_
