/**
 * Site-wide configuration
 */

export const siteConfig = {
  author: {
    email: "me@yusoofsh.id",
    name: "Yusoof Moh",
  },
  social: {
    github: "https://github.com/yusoofsh",
    linkedin: "https://linkedin.com/in/yusoofsh",
    twitter: "https://twitter.com/yusoofsh",
  },
} as const;

export type SiteConfig = typeof siteConfig;
