// Worker-free shortlink model: types and pure parsing used by both the
// server API and the dashboard client graph. Kept free of `cloudflare:`
// imports so SSR bundles that include it never need the Workers runtime.
import {
  SHORTLINK_ALPHABET,
  SHORTLINK_MAX_LENGTH,
  SHORTLINK_MIN_LENGTH,
} from "./shortlink-constants";

const CAMPAIGN_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const SHORTLINK_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SHORTLINK_CODE_PATTERN = new RegExp(
  `^[${SHORTLINK_ALPHABET}]{${SHORTLINK_MIN_LENGTH},${SHORTLINK_MAX_LENGTH}}$`,
);
export const ISO_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export interface ShortlinkCampaign {
  medium?: string;
  name?: string;
  source?: string;
}

export interface ShortlinkRecord {
  campaign?: ShortlinkCampaign;
  expiresAt?: string;
  label?: string;
  path?: string;
  target?: string;
}

export function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function invalidCampaignMessage(): string {
  return "Campaign values must use letters, numbers, dots, underscores, or hyphens and be at most 64 characters";
}

function invalidLabelMessage(): string {
  return "Shortlink labels must use letters, numbers, dots, underscores, or hyphens and be at most 64 characters";
}

export function parseStoredExpiration(value: string): Date | null {
  if (!ISO_UTC_TIMESTAMP_PATTERN.test(value)) return null;
  const expiresAt = new Date(value);
  return Number.isFinite(expiresAt.getTime()) ? expiresAt : null;
}

export function isValidShortlinkCode(code: string): boolean {
  return SHORTLINK_CODE_PATTERN.test(code);
}

export function parseCampaign(value: unknown): {
  campaign?: ShortlinkCampaign;
  error?: string;
} {
  if (value === undefined) return {};
  if (!isObjectRecord(value)) {
    return { error: invalidCampaignMessage() };
  }

  const input = value;
  const campaign: ShortlinkCampaign = {};
  for (const field of ["name", "source", "medium"] as const) {
    const fieldValue = input[field];
    if (fieldValue === undefined) continue;
    if (
      typeof fieldValue !== "string" ||
      !CAMPAIGN_VALUE_PATTERN.test(fieldValue)
    ) {
      return { error: invalidCampaignMessage() };
    }
    campaign[field] = fieldValue;
  }

  if (Object.keys(campaign).length === 0) {
    return { error: invalidCampaignMessage() };
  }
  return { campaign };
}

export function parseShortlinkLabel(value: unknown): {
  error?: string;
  label?: string;
} {
  if (value === undefined) return {};
  if (typeof value !== "string" || !SHORTLINK_LABEL_PATTERN.test(value)) {
    return { error: invalidLabelMessage() };
  }
  return { label: value };
}

export function parseShortlinkRecord(value: unknown): ShortlinkRecord | null {
  if (!isObjectRecord(value)) return null;

  const input = value;
  const hasPath = "path" in input;
  const hasTarget = "target" in input;
  if (hasPath === hasTarget) return null;
  const path = input.path;
  const target = input.target;
  if (hasPath && typeof path !== "string") return null;
  if (hasTarget && typeof target !== "string") return null;
  if (input.expiresAt !== undefined && typeof input.expiresAt !== "string") {
    return null;
  }
  if (
    typeof input.expiresAt === "string" &&
    !parseStoredExpiration(input.expiresAt)
  ) {
    return null;
  }

  const campaign = parseCampaign(input.campaign);
  if (campaign.error) return null;
  const label = parseShortlinkLabel(input.label);
  if (label.error) return null;

  const record: ShortlinkRecord = {};
  if (typeof path === "string") record.path = path;
  if (typeof target === "string") record.target = target;
  if (typeof input.expiresAt === "string") record.expiresAt = input.expiresAt;
  if (campaign.campaign) record.campaign = campaign.campaign;
  if (label.label) record.label = label.label;
  return record;
}
