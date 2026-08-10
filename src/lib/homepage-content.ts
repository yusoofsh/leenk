import type { CmsBlock, CmsRevisionContent } from "./dashboard/cms";

// The imported homepage content, extracted from the source-rendered page in
// `src/pages/index.astro`. Inline links use the CMS bounded token syntax
// `[label](kind:target)`; emphasis from the original markup degrades to
// plain text.

const HOME_LINK = "[Mail](email:me@yusoofsh.id)";
const TWITTER_LINK = "[Twitter](internal:/twitter)";
const LINKEDIN_LINK = "[LinkedIn](internal:/linkedin)";
const GITHUB_LINK = "[GitHub](internal:/github)";

const FULL_BLOCKS: CmsBlock[] = [
  {
    text: "In the name of Allah, and by His grace. My name is pronounced yu-soof. I'm a Malang-based full-stack and platform engineer delivering TypeScript applications, data workflows, CI/CD, Kubernetes migrations, and production reliability improvements.",
    type: "intro",
  },
  { heading: "What I do", text: "", type: "section" },
  {
    items: [
      "Applications and data: TypeScript, React, TanStack, Node.js, Hono, NestJS, Astro, PostgreSQL, and migration workflows.",
      "Platforms and delivery: Docker, Kubernetes, Amazon EKS, Helm, Argo CD, GitHub Actions, Kafka, Cloudflare Workers, and R2.",
      "Quality and operations: Vitest, Playwright, OpenTelemetry, Grafana, Loki, Tempo, Prometheus, staged rollouts, and root-cause analysis.",
    ],
    type: "bullet_list",
  },
  { heading: "Selected work", text: "", type: "section" },
  {
    items: [
      "[NADI](url:https://nadi.co.id/): Migrated a payment workflow to DOKU and helped improve reported transaction success from 60% to 95% over three months.",
      "[YDSF](url:https://ydsf.org/): Modernized donation, verification, analytics, export, authentication, and database-migration workflows.",
      "[ElectGo](url:https://electgo.com/): Migrated seven production PIM deployments and 300+ n8n workflows to Amazon EKS through verified infrastructure and application cutovers.",
    ],
    type: "bullet_list",
  },
  { heading: "Beyond work", text: "", type: "section" },
  {
    text: "I cultivate edamame, enjoy regional motorcycle tours, and keep a steady habit of deep research. I base my understanding of Islam on the first three generations of the ummah, focusing on tawhid and tafsir. I conduct tahsin classes and support local communities.",
    type: "paragraph",
  },
  {
    text: `Open to meaningful remote or contract collaborations. Reach me via ${HOME_LINK} / ${TWITTER_LINK} / ${LINKEDIN_LINK} / ${GITHUB_LINK}.`,
    type: "paragraph",
  },
  {
    text: "May Allah bless our endeavors and lead us to His everlasting mercy.",
    type: "paragraph",
  },
];

const TLDR_BLOCKS: CmsBlock[] = [
  {
    text: `Bismillah. I'm a Malang-based full-stack and platform engineer focused on TypeScript applications, data workflows, CI/CD, Kubernetes, and production reliability. Recently, I improved [NADI](url:https://nadi.co.id/)'s payment workflow through a DOKU migration, modernized [YDSF](url:https://ydsf.org/)'s donation platform, and migrated seven [ElectGo](url:https://electgo.com/) production deployments plus 300+ n8n workflows to Amazon EKS. Open to meaningful remote or contract collaborations. Reach me via ${HOME_LINK} / ${TWITTER_LINK} / ${LINKEDIN_LINK} / ${GITHUB_LINK}. Baarakallahu fiik.`,
    type: "paragraph",
  },
];

export const HOMEPAGE_SEO = {
  seoDescription:
    "Malang-based full-stack/DevOps engineer. Accelerated time-to-production at Nadi; built YDSF's Muslim crowdfunding platform end-to-end. TypeScript/React, Hono/Bun, Docker/Traefik/Tailscale, OpenTelemetry/Sentry, UU PDP-aware.",
  seoKeywords:
    "Yusoof Moh, full-stack engineer Indonesia, DevOps Indonesia, TypeScript React, Hono Bun, Docker Traefik Tailscale, OpenTelemetry Sentry, UU PDP compliance, Nadi, YDSF, crowdfunding platform",
  seoTitle: "Yusoof Moh \u2014 Full-Stack/DevOps Engineer in Indonesia",
  title: "Meet me, Yusoof Moh",
} as const;

export const HOMEPAGE_PROFILE_METADATA = {
  email: "me@yusoofsh.id",
  location: "Malang, Indonesia",
  name: "Yusoof Moh",
} as const;

export function buildHomepageRevisionContent(): CmsRevisionContent {
  return {
    blocksFull: FULL_BLOCKS,
    blocksTldr: TLDR_BLOCKS,
    profileMetadata: { ...HOMEPAGE_PROFILE_METADATA },
    seoDescription: HOMEPAGE_SEO.seoDescription,
    seoKeywords: HOMEPAGE_SEO.seoKeywords,
    seoTitle: HOMEPAGE_SEO.seoTitle,
    socialCopy: HOMEPAGE_SEO.seoDescription,
    title: HOMEPAGE_SEO.title,
  };
}
