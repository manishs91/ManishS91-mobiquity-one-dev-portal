"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`rounded px-2 py-1 text-xs font-semibold text-[#9fb3c8] hover:bg-code-line hover:text-white ${className}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
