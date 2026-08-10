import { describe, expect, it } from "vitest";

import {
  renderBlock,
  renderHomepageBlocks,
  renderInlineText,
} from "./homepage-render";

describe("renderInlineText", () => {
  it("escapes HTML and keeps plain text intact", () => {
    expect(renderInlineText('a <b> & "quote"')).toBe(
      "a &lt;b&gt; &amp; &quot;quote&quot;",
    );
  });

  it("renders known external links with analytics attributes", () => {
    const html = renderInlineText("See [NADI](url:https://nadi.co.id/) now");
    expect(html).toContain(
      'href="https://nadi.co.id/" data-analytics-event="outbound_link_clicked" data-analytics-dimension="nadi"',
    );
    expect(html).toContain(">NADI</a>");
  });

  it("renders email and internal social links", () => {
    const html = renderInlineText(
      "[Mail](email:me@yusoofsh.id) [GitHub](internal:/github)",
    );
    expect(html).toContain(
      'href="mailto:me@yusoofsh.id" data-analytics-event="contact_link_clicked" data-analytics-dimension="email"',
    );
    expect(html).toContain(
      'href="/github" data-analytics-event="social_link_clicked" data-analytics-dimension="github"',
    );
  });

  it("renders unknown external targets without analytics attributes", () => {
    const html = renderInlineText("[X](url:https://example.com/)");
    expect(html).toContain('href="https://example.com/"');
    expect(html).not.toContain("data-analytics-event");
  });
});

describe("renderBlock", () => {
  it("maps known section headings to analytics keys", () => {
    const html = renderBlock({
      heading: "What I do",
      text: "",
      type: "section",
    });
    expect(html).toContain('data-analytics-section="what_i_do"');
    expect(
      renderBlock({ heading: "Elsewhere", text: "", type: "section" }),
    ).not.toContain("data-analytics-section");
  });

  it("renders bullet lists and contact blocks", () => {
    const list = renderBlock({
      items: ["One", "[Two](url:https://ydsf.org/)"],
      type: "bullet_list",
    });
    expect(list).toContain("<ul><li>One</li>");
    expect(list).toContain('data-analytics-dimension="ydsf"');

    const contact = renderBlock({
      email: "me@yusoofsh.id",
      links: [{ kind: "internal", label: "GitHub", target: "/github" }],
      type: "contact",
    });
    expect(contact).toContain('href="mailto:me@yusoofsh.id"');
    expect(contact).toContain('data-analytics-dimension="github"');
  });

  it("joins blocks in order", () => {
    const html = renderHomepageBlocks([
      { text: "Intro", type: "intro" },
      { text: "Body", type: "paragraph" },
    ]);
    expect(html).toBe("<p>Intro</p>\n<p>Body</p>");
  });
});
