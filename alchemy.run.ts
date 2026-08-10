import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

// Leenk's Alchemy stack. Two stages mirror the two named Environments:
// `dev` is an isolated preview Worker on workers.dev, `prod` is the live
// Worker behind www.yusoofsh.id. Physical names for existing resources are
// pinned exactly so adoption never creates a second bucket or dataset.
import { Stack } from "alchemy/Stack";

const isProd = (stage: string) => stage === "prod";

const StaticFiles = Cloudflare.R2.Bucket("StaticFiles", {
  name: "leenk-static",
});

const ShortlinkAnalytics = Cloudflare.AnalyticsEngine.Dataset(
  "ShortlinkAnalytics",
  // Single dataset for shortlink clicks. Rows written before the label
  // migration carry the short code as `index1`; newer rows carry the
  // human-readable label. Legacy rows age out with Analytics Engine's
  // three-month retention.
  { dataset: "leenk_shortlinks" },
);

const SiteAnalytics = Cloudflare.AnalyticsEngine.Dataset("SiteAnalytics", {
  dataset: "leenk_site_events",
});

const Cms = Cloudflare.D1.Database(
  "Cms",
  Effect.gen(function* () {
    const stack = yield* Stack;
    return {
      name: isProd(stack.stage) ? "leenk-cms" : "leenk-cms-dev",
      primaryLocationHint: "apac" as const,
      migrationsDir: "./d1/migrations",
    };
  }),
);

export const Website = Cloudflare.Website.Astro(
  "Website",
  Effect.gen(function* () {
    const stack = yield* Stack;
    const prod = isProd(stack.stage);
    return {
      // `dev-leenk` matches the existing `*-leenk.yusoofsh.workers.dev`
      // Access pattern; `leenk` is the live Worker name to adopt in prod.
      name: prod ? "leenk" : "dev-leenk",
      domain: prod ? "www.yusoofsh.id" : null,
      astro: {
        site: "https://www.yusoofsh.id/",
        output: "server" as const,
      },
      env: {
        STATIC_FILES: StaticFiles,
        SHORTLINK_ANALYTICS: ShortlinkAnalytics,
        SITE_ANALYTICS: SiteAnalytics,
        CMS: Cms,
        BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
        STATIC_UPLOAD_TOKEN: Config.redacted("STATIC_UPLOAD_TOKEN"),
        CLOUDFLARE_ACCOUNT_ID: Config.string("CLOUDFLARE_ACCOUNT_ID").pipe(
          Config.withDefault(""),
        ),
        CLOUDFLARE_ANALYTICS_TOKEN: Config.option(
          Config.redacted("CLOUDFLARE_ANALYTICS_TOKEN"),
        ),
      },
    };
  }),
);

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "Leenk",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website;
    return { url: website.url };
  }),
);
