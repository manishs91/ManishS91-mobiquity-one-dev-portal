"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/useApi";

const METHODS = [
  ["cards", "Cards"],
  ["upi", "UPI"],
  ["wallets", "Wallets"],
  ["netbanking", "Net banking"],
  ["emi", "Card EMI"],
  ["bnpl", "Pay later"],
] as const;

export function GoLiveForm({ ready, defaultEmail, defaultName, orgName }: { ready: boolean; defaultEmail: string; defaultName: string; orgName: string }) {
  const router = useRouter();
  const { call, busy, error, fieldErrors } = useApi();
  const err = (k: string) => (fieldErrors[k] ? <p className="mt-1 text-xs text-danger">{fieldErrors[k]}</p> : null);

  return (
    <form
      className="panel space-y-6 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ok = await call("/api/go-live", {
          body: {
            legalName: f.get("legalName"),
            registrationNumber: f.get("registrationNumber"),
            website: f.get("website"),
            businessCategory: f.get("businessCategory"),
            expectedMonthlyVolume: f.get("expectedMonthlyVolume"),
            paymentMethods: f.getAll("paymentMethods"),
            integrationType: f.get("integrationType"),
            contactName: f.get("contactName"),
            contactEmail: f.get("contactEmail"),
            contactPhone: f.get("contactPhone"),
            notes: f.get("notes") || undefined,
          },
        });
        if (ok) router.refresh();
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-bold">Business</legend>
        <div><label className="label" htmlFor="legalName">Registered business name</label><input id="legalName" name="legalName" className="field" defaultValue={orgName} required />{err("legalName")}</div>
        <div><label className="label" htmlFor="registrationNumber">Registration number (CIN / GSTIN)</label><input id="registrationNumber" name="registrationNumber" className="field" required />{err("registrationNumber")}</div>
        <div><label className="label" htmlFor="website">Website</label><input id="website" name="website" type="url" className="field" placeholder="https://" required />{err("website")}</div>
        <div><label className="label" htmlFor="businessCategory">Business category</label><input id="businessCategory" name="businessCategory" className="field" placeholder="e.g. Online retail, gifting" required />{err("businessCategory")}</div>
        <div>
          <label className="label" htmlFor="expectedMonthlyVolume">Expected monthly volume</label>
          <select id="expectedMonthlyVolume" name="expectedMonthlyVolume" className="field" required>
            <option value="< ₹10 lakh">Under ₹10 lakh</option>
            <option value="₹10 lakh – ₹1 crore">₹10 lakh to ₹1 crore</option>
            <option value="₹1 – ₹10 crore">₹1 crore to ₹10 crore</option>
            <option value="> ₹10 crore">Over ₹10 crore</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-bold">Integration</legend>
        <p className="label">Payment methods you&apos;ll accept</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {METHODS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" name="paymentMethods" value={v} defaultChecked={v === "cards" || v === "upi"} />{l}</label>
          ))}
        </div>
        {err("paymentMethods")}
        <p className="label mt-4">How you&apos;re integrating</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="integrationType" value="s2s" defaultChecked />Server-to-server API</label>
          <label className="flex items-center gap-2"><input type="radio" name="integrationType" value="hosted" />Hosted checkout</label>
          <label className="flex items-center gap-2"><input type="radio" name="integrationType" value="both" />Both</label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-bold">Technical contact</legend>
        <div><label className="label" htmlFor="contactName">Name</label><input id="contactName" name="contactName" className="field" defaultValue={defaultName} required /></div>
        <div><label className="label" htmlFor="contactEmail">Email</label><input id="contactEmail" name="contactEmail" type="email" className="field" defaultValue={defaultEmail} required /></div>
        <div><label className="label" htmlFor="contactPhone">Phone</label><input id="contactPhone" name="contactPhone" type="tel" className="field" required />{err("contactPhone")}</div>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">Anything else we should know? (optional)</label>
        <textarea id="notes" name="notes" rows={3} className="field" maxLength={2000} />
      </div>

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy || !ready}>{busy ? "Submitting…" : "Submit for review"}</button>
      {!ready ? <p className="hint">Finish the checklist above to submit.</p> : null}
    </form>
  );
}
