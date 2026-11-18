"use client";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { highlightJson } from "./highlight";

export interface CodeTab {
  id: string;
  label: string;
  code: string;
  json?: boolean;
}

const STORAGE_KEY = "m1dp:lang";

/**
 * Dark code panel with language tabs. The chosen language is remembered so every
 * sample on every page opens in the developer's language.
 */
export function CodeTabs({ tabs, title, rememberLanguage = false, maxHeight = "28rem" }: { tabs: CodeTab[]; title?: string; rememberLanguage?: boolean; maxHeight?: string }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    if (!rememberLanguage) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && tabs.some((t) => t.id === saved)) setActive(saved);
    } catch {}
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (tabs.some((t) => t.id === id)) setActive(id);
    };
    window.addEventListener("m1dp:lang", onChange);
    return () => window.removeEventListener("m1dp:lang", onChange);
  }, [rememberLanguage, tabs]);

  const select = (id: string) => {
    setActive(id);
    if (!rememberLanguage) return;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
    window.dispatchEvent(new CustomEvent("m1dp:lang", { detail: id }));
  };

  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] bg-code text-[#dbe7f3]">
      <div className="flex items-center gap-1 border-b border-code-line px-2">
        {title ? <span className="px-2 py-2 text-xs font-semibold text-[#9fb3c8]">{title}</span> : null}
        <div role="tablist" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {tabs.length > 1 &&
            tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === tab.id}
                onClick={() => select(t.id)}
                className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-semibold ${
                  t.id === tab.id ? "border-signal text-white" : "border-transparent text-[#9fb3c8] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
        <CopyButton text={tab.code} />
      </div>
      <pre className="overflow-auto p-4 text-[12.5px] leading-[1.6]" style={{ maxHeight }}>
        <code>{tab.json ? highlightJson(tab.code) : tab.code}</code>
      </pre>
    </div>
  );
}
