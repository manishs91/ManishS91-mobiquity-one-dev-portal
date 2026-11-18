import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const PAGES: Record<string, { title: string; body: string }> = {
  terms: {
    title: "Developer terms",
    body: "Placeholder. Replace with the Mobiquity One developer and sandbox terms approved by your legal team before launch.",
  },
  privacy: {
    title: "Privacy",
    body: "Placeholder. Replace with the privacy notice that covers developer accounts, request logs and support data.",
  },
};

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const page = PAGES[(await params).page];
  if (!page) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="prose-doc mx-auto px-5 py-16">
        <h1>{page.title}</h1>
        <blockquote><p>{page.body}</p></blockquote>
      </main>
      <SiteFooter />
    </>
  );
}
