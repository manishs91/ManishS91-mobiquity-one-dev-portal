/**
 * How the API reference is organised in the portal navigation.
 *
 * The Mobiquity One spec uses five coarse tags. Developers find endpoints faster
 * by task, so operations are mapped into groups by path. Anything that matches no
 * group lands in "Other" so new endpoints never disappear silently.
 *
 * Set `visible: false` to hide a product area from the public reference
 * (the routes stay in the spec and keep working in the sandbox).
 */
export interface ApiGroup {
  id: string;
  title: string;
  description: string;
  /** Matched against "METHOD /path" (e.g. "POST /ecom/refund"). First matching group wins. */
  match: RegExp[];
  visible: boolean;
  badge?: string;
}

export const API_GROUPS: ApiGroup[] = [
  {
    id: "authentication",
    title: "Authentication",
    description: "Generate, refresh and revoke OAuth2 access tokens for server-to-server calls.",
    match: [/^POST \/authorization\/auth\/oauth2\//],
    visible: true,
  },
  {
    id: "payments",
    title: "Payments",
    description: "Initiate payments across cards, UPI, wallets and net banking, and complete OTP challenges.",
    match: [/\/ecom\/(unified)?initiatePayment$/i, /\/ecom\/(submit|resend)Otp$/i],
    visible: true,
  },
  {
    id: "status-refunds",
    title: "Status & refunds",
    description: "Check the outcome of a payment and issue full or partial refunds.",
    match: [/\/ecom\/payments\/(order)?enquiry$/i, /\/ecom\/refund$/i],
    visible: true,
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "The transaction status callback Mobiquity One sends to your primary and fallback URLs.",
    match: [/\/txnstatus\/webhook$/i],
    visible: true,
  },
  {
    id: "saved-methods",
    title: "Saved payment methods",
    description: "List and delete tokenized cards and saved UPI IDs, and validate UPI handles.",
    match: [
      /\/ecom\/SavedPaymentMethods$/i,
      /\/ecom\/(fetch|delete)CardTokens$/i,
      /\/ecom\/(fetch|delete)VPAs$/i,
      /\/ecom\/validateUpi$/i,
      /fetchValidUpiHandle$/i,
    ],
    visible: true,
  },
  {
    id: "cards-bin",
    title: "Card & BIN lookup",
    description: "Look up issuer, network and card type from a BIN before charging.",
    match: [/\/ecom\/fetchBinDetail$/i, /\/fetchcarddetails\//i],
    visible: true,
  },
  {
    id: "merchant-config",
    title: "Merchant configuration",
    description: "Payment attributes configured for your merchant hierarchy.",
    match: [/\/ecom\/fetchMerchantPaymentRoles$/i],
    visible: true,
  },
  {
    id: "offers",
    title: "Offers",
    description: "Create and manage discounts, and apply merchant or payment-method offers at checkout.",
    match: [/^\w+ \/offers\//, /\/mpg\/checkout\/(apply|save)\w*Offers?$/i, /^GET \/authorization\/auth\/oauth2\/revokeToken$/],
    visible: true,
  },
  {
    id: "checkout",
    title: "Hosted checkout",
    description: "Embed the Mobiquity One web checkout in an iframe.",
    match: [/\/mpg\/web-checkout$/i],
    visible: true,
  },
  {
    id: "bnpl",
    title: "BNPL & credit",
    description: "Check buy-now-pay-later eligibility, delink accounts and handle lender redirects.",
    match: [/CheckEligibility$/i, /\/ecom\/DeLink$/i, /merchantRedirectURL$/i],
    visible: false,
    badge: "Credit",
  },
  {
    id: "mandates",
    title: "Mandates",
    description: "Fetch, execute, pause, resume and revoke recurring payment mandates.",
    match: [/^\w+ \/mandates\//],
    visible: false,
    badge: "Recurring",
  },
];

export const OTHER_GROUP: ApiGroup = {
  id: "other",
  title: "Other",
  description: "Endpoints not yet assigned to a group in src/config/api-groups.ts.",
  match: [],
  visible: true,
};
