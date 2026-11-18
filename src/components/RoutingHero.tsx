/**
 * The hero illustration: one payment request, three processors, one chosen route
 * and a fallback. Processor IDs are the real `preferredPg` values from the spec.
 */
export function RoutingHero() {
  const processors = [
    { name: "Razorpay", id: "6", y: 70 },
    { name: "PayU", id: "7", y: 170 },
    { name: "PhonePe", id: "12", y: 270 },
  ];
  return (
    <figure className="relative" aria-label="A payment request routed to one of three processors, with a fallback route">
      <svg viewBox="0 0 560 340" className="h-auto w-full" role="img">
        <title>Payment routing</title>
        <defs>
          <style>{`
            .route { stroke-dasharray: 420; stroke-dashoffset: 420; animation: draw 1.1s 0.3s ease-out forwards; }
            .route-fb { stroke-dasharray: 6 6; opacity: 0; animation: fade 0.4s 1.4s forwards; }
            .chosen { opacity: 0; animation: fade 0.3s 1.2s forwards; }
            @keyframes draw { to { stroke-dashoffset: 0; } }
            @keyframes fade { to { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) { .route { stroke-dashoffset: 0; animation: none; } .route-fb, .chosen { opacity: 1; animation: none; } }
          `}</style>
        </defs>

        {/* idle routes */}
        {processors.map((p) => (
          <path key={p.id} d={`M228 170 C 300 170, 320 ${p.y}, 392 ${p.y}`} stroke="var(--color-line)" strokeWidth="2" fill="none" />
        ))}
        {/* chosen route (Razorpay) and fallback (PayU) */}
        <path className="route" d="M228 170 C 300 170, 320 70, 392 70" stroke="var(--color-signal)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="route-fb" d="M228 170 C 300 170, 320 170, 392 170" stroke="var(--color-signal)" strokeWidth="2" fill="none" />

        {/* request card */}
        <g>
          <rect x="8" y="88" width="220" height="164" rx="12" fill="var(--color-code)" />
          <text x="24" y="114" fontFamily="var(--font-mono)" fontSize="11" fill="#9fb3c8">POST /ecom/initiatePayment</text>
          <g fontFamily="var(--font-mono)" fontSize="11.5">
            <text x="24" y="142" fill="#8fd3c3">"amount"<tspan fill="#dbe7f3">: </tspan><tspan fill="#f6c98b">"500"</tspan></text>
            <text x="24" y="162" fill="#8fd3c3">"currencyCode"<tspan fill="#dbe7f3">: </tspan><tspan fill="#f6c98b">"INR"</tspan></text>
            <text x="24" y="182" fill="#8fd3c3">"method"<tspan fill="#dbe7f3">: </tspan><tspan fill="#f6c98b">"UPI"</tspan></text>
            <text x="24" y="202" fill="#8fd3c3">"preferredPg"<tspan fill="#dbe7f3">: </tspan><tspan fill="#f6c98b">"6"</tspan></text>
            <text x="24" y="222" fill="#8fd3c3">"fallback"<tspan fill="#dbe7f3">: </tspan><tspan fill="#f6c98b">"Y"</tspan></text>
          </g>
        </g>
        <circle cx="228" cy="170" r="5" fill="var(--color-signal)" />

        {/* processors */}
        {processors.map((p, i) => (
          <g key={p.id}>
            <rect x="392" y={p.y - 26} width="160" height="52" rx="10" fill="var(--color-surface)" stroke={i === 0 ? "var(--color-signal)" : "var(--color-line)"} strokeWidth={i === 0 ? 2 : 1} />
            <text x="410" y={p.y - 3} fontSize="14" fontWeight="700" fill="var(--color-ink)">{p.name}</text>
            <text x="410" y={p.y + 15} fontSize="11.5" fill="var(--color-ink-soft)">preferredPg {p.id}</text>
          </g>
        ))}
        <text className="chosen" x="540" y="62" textAnchor="end" fontSize="11" fontWeight="700" fill="var(--color-rail)">routed</text>
        <text className="route-fb" x="540" y="162" textAnchor="end" fontSize="11" fill="var(--color-ink-soft)">fallback</text>
      </svg>
    </figure>
  );
}
