import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guides live in content/docs/*.md with a small frontmatter block:
 *   ---
 *   title: Accept a payment
 *   section: Accept payments
 *   order: 20
 *   summary: One line shown in navigation and search.
 *   ---
 */
export interface DocMeta {
  slug: string;
  title: string;
  section: string;
  order: number;
  summary?: string;
}
export interface Doc extends DocMeta {
  body: string;
}

export const SECTION_ORDER = ["Get started", "Server-to-server integration", "Checkout integration", "After the payment", "Go live", "Reference"];

const DIR = path.join(process.cwd(), "content", "docs");

function parse(file: string): Doc {
  const raw = readFileSync(path.join(DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const slug = file.replace(/\.md$/, "");
  return {
    slug,
    title: meta.title ?? slug,
    section: meta.section ?? "Reference",
    order: Number(meta.order ?? 100),
    summary: meta.summary,
    body: m ? raw.slice(m[0].length) : raw,
  };
}

let cache: Doc[] | undefined;
export function allDocs(): Doc[] {
  if (!cache || process.env.NODE_ENV === "development") {
    cache = readdirSync(DIR)
      .filter((f) => f.endsWith(".md"))
      .map(parse)
      .sort((a, b) => a.order - b.order);
  }
  return cache;
}

export function getDoc(slug: string) {
  return allDocs().find((d) => d.slug === slug);
}

export function docNav() {
  const docs = allDocs().filter((d) => d.slug !== "index");
  const sections = [...new Set([...SECTION_ORDER, ...docs.map((d) => d.section)])];
  return sections
    .map((section) => ({ section, docs: docs.filter((d) => d.section === section) }))
    .filter((s) => s.docs.length);
}

/** Previous / next guide in reading order. */
export function neighbours(slug: string) {
  const flat = docNav().flatMap((s) => s.docs);
  const i = flat.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? flat[i - 1] : undefined, next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : undefined };
}

export function headings(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
    text: m[1].replace(/`/g, ""),
    id: m[1].replace(/`/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  }));
}
