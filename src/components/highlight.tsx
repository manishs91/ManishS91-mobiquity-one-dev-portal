import type { ReactNode } from "react";

/** Tiny JSON highlighter: keys, strings, numbers, literals. No dependency, safe (no innerHTML). */
export function highlightJson(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[1]) {
      out.push(<span key={i++} className={m[2] ? "tok-key" : "tok-str"}>{m[1]}</span>);
      if (m[2]) out.push(m[2]);
    } else if (m[3]) out.push(<span key={i++} className="tok-lit">{m[3]}</span>);
    else if (m[4]) out.push(<span key={i++} className="tok-num">{m[4]}</span>);
    last = re.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}
