// Profile links carry an amount; per-booking notes still require copy/paste.
export function directPaymentLink(input: {
  provider: string;
  accountHandle: string;
  paymentUrl: string;
  amountCents: number;
}) {
  if (input.provider !== "cash_app") {
    return { url: input.paymentUrl || "https://venmo.com/", prefillsAmount: false };
  }
  let handle = input.accountHandle.trim().replace(/^\$/, "");
  if (!/^[a-z0-9]{1,20}$/i.test(handle) || !/[a-z]/i.test(handle)) {
    try {
      const profile = new URL(input.paymentUrl);
      handle = profile.protocol === "https:" && profile.hostname === "cash.app"
        ? profile.pathname.match(/^\/\$([a-z0-9]{1,20})(?:\/|$)/i)?.[1] || ""
        : "";
    } catch {
      handle = "";
    }
  }
  if (handle && Number.isSafeInteger(input.amountCents) && input.amountCents > 0) {
    return { url: `https://cash.app/$${handle}/${(input.amountCents / 100).toFixed(2)}`, prefillsAmount: true };
  }
  return { url: input.paymentUrl || "https://cash.app/send", prefillsAmount: false };
}
