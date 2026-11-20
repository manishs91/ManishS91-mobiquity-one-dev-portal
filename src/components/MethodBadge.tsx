const styles: Record<string, string> = {
  get: "bg-ok-wash text-ok-deep",
  post: "bg-[#e6eefb] text-[#1f4fa3]",
  put: "bg-signal-wash text-signal-ink",
  patch: "bg-signal-wash text-signal-ink",
  delete: "bg-danger-wash text-danger",
};

export function MethodBadge({ method, size = "md" }: { method: string; size?: "sm" | "md" }) {
  const m = method.toLowerCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded font-mono font-semibold uppercase ${styles[m] ?? "bg-line-soft text-ink-soft"} ${
        size === "sm" ? "w-[3.1rem] text-[10px] leading-5" : "px-2 text-xs leading-6"
      }`}
    >
      {m === "delete" ? "del" : m}
    </span>
  );
}
