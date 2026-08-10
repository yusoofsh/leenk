import {
  INLINE_LINK_PATTERN,
  isCmsLinkKind,
  type CmsBlock,
  type CmsLinkKind,
} from "./dashboard/cms";

const SECTION_ANALYTICS_KEYS: Record<string, string> = {
  "Beyond work": "beyond_work",
  "Selected work": "selected_work",
  "What I do": "what_i_do",
};

const KNOWN_EXTERNAL_DIMENSIONS: Record<string, string> = {
  "electgo.com": "electgo",
  "nadi.co.id": "nadi",
  "ydsf.org": "ydsf",
};

const KNOWN_INTERNAL_DIMENSIONS: Record<string, string> = {
  "/github": "github",
  "/linkedin": "linkedin",
  "/twitter": "twitter",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkAnalytics(
  kind: CmsLinkKind,
  target: string,
): { dimension?: string; event?: string } {
  if (kind === "email") {
    return { dimension: "email", event: "contact_link_clicked" };
  }
  if (kind === "internal") {
    const dimension = KNOWN_INTERNAL_DIMENSIONS[target];
    return dimension ? { dimension, event: "social_link_clicked" } : {};
  }
  if (kind === "url") {
    try {
      const host = new URL(target).hostname.replace(/^www\./, "");
      const dimension = KNOWN_EXTERNAL_DIMENSIONS[host];
      return dimension ? { dimension, event: "outbound_link_clicked" } : {};
    } catch {
      return {};
    }
  }
  return {};
}

function linkHref(kind: CmsLinkKind, target: string): string {
  if (kind === "email") return `mailto:${target}`;
  return target;
}

function renderInlineLink(
  label: string,
  kind: CmsLinkKind,
  target: string,
): string {
  const analytics = linkAnalytics(kind, target);
  const attributes = [
    `href="${escapeHtml(linkHref(kind, target))}"`,
    analytics.event ? `data-analytics-event="${analytics.event}"` : "",
    analytics.dimension
      ? `data-analytics-dimension="${analytics.dimension}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<a ${attributes}>${escapeHtml(label)}</a>`;
}

export function renderInlineText(text: string): string {
  let result = "";
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_LINK_PATTERN)) {
    const index = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, index));
    const [, label, kind, target] = match;
    const kindValue = kind ?? "url";
    if (!isCmsLinkKind(kindValue)) {
      result += escapeHtml(match[0]);
    } else {
      result += renderInlineLink(label ?? "", kindValue, target ?? "");
    }
    lastIndex = index + match[0].length;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

export function renderBlock(block: CmsBlock): string {
  switch (block.type) {
    case "intro":
      return `<p>${renderInlineText(block.text)}</p>`;
    case "paragraph":
      return `<p>${renderInlineText(block.text)}</p>`;
    case "section": {
      const analyticsKey = SECTION_ANALYTICS_KEYS[block.heading];
      const attributes = analyticsKey
        ? ` data-analytics-section="${analyticsKey}"`
        : "";
      const text = block.text ? `<p>${renderInlineText(block.text)}</p>` : "";
      return `<h2${attributes}>${escapeHtml(block.heading)}</h2>${text}`;
    }
    case "bullet_list": {
      const items = block.items
        .map((item) => `<li>${renderInlineText(item)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    case "contact": {
      const email = `<a href="mailto:${escapeHtml(block.email)}" data-analytics-event="contact_link_clicked" data-analytics-dimension="email">${escapeHtml(block.email)}</a>`;
      const links = block.links
        .map((link) => renderInlineLink(link.label, link.kind, link.target))
        .join(" / ");
      return `<p>${email}${links ? ` / ${links}` : ""}</p>`;
    }
    default:
      return "";
  }
}

export function renderHomepageBlocks(blocks: CmsBlock[]): string {
  return blocks.map(renderBlock).join("\n");
}
