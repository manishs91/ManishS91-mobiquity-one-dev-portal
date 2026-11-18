"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/useApi";

export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const { call, busy, error } = useApi();
  const decide = async (decision: "approved" | "rejected") => {
    const note = decision === "rejected" ? prompt("What does the developer need to change?") : undefined;
    if (decision === "rejected" && !note) return;
    if (decision === "approved" && !confirm("Approve production access for this organisation?")) return;
    if (await call(`/api/admin/go-live/${id}`, { body: { decision, note: note ?? undefined } })) router.refresh();
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => decide("rejected")}>Request changes</button>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide("approved")}>Approve</button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
