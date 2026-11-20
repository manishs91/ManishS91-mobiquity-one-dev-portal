import { Marked } from "marked";

/**
 * Renders trusted, repository-authored markdown (content/docs). Raw HTML in the
 * markdown is escaped, so docs content can't inject scripts.
 */
const marked = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = slugify(tokens.map((t) => ("text" in t ? t.text : "")).join(""));
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safe = /^(https?:|mailto:|\/|#)/i.test(href) ? href : "#";
      const external = /^https?:/i.test(safe);
      return `<a href="${safe}"${title ? ` title="${title}"` : ""}${external ? ' rel="noopener noreferrer" target="_blank"' : ""}>${text}</a>`;
    },
  },
});

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string;
}

/** Inline markdown (bold, code, links) for short strings such as spec descriptions. HTML is escaped. */
export function renderInline(src: string): string {
  return marked.parseInline(src, { async: false }) as string;
}

export function Markdown({ source, className = "prose-doc" }: { source: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
