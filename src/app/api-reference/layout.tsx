import { SiteHeader } from "@/components/SiteHeader";

export default function ApiReferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div id="main">{children}</div>
    </>
  );
}
