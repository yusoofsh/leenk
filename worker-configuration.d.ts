/* eslint-disable */
// Source-owned environment types for the Worker bindings. Kept in sync with
// `alchemy.run.ts`; no Wrangler type generation is used.
interface __BaseEnv_Env {
	STATIC_FILES: R2Bucket;
	SHORTLINK_ANALYTICS: AnalyticsEngineDataset;
	SITE_ANALYTICS: AnalyticsEngineDataset;
	CMS?: D1Database;
	BETTER_AUTH_SECRET?: string;
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_ANALYTICS_TOKEN?: string;
	STATIC_UPLOAD_TOKEN?: string;
}
declare namespace Cloudflare {
	interface Env extends __BaseEnv_Env {}
}
interface Env extends __BaseEnv_Env {}
