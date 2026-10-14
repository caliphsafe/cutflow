import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "lib/payments/stripe-provider.ts");
const source = fs.readFileSync(file, "utf8");
const forbidden = ["application_fee_amount", "transfer_data", "on_behalf_of"];
const found = forbidden.filter((token) => source.includes(token));

if (!source.includes("stripeAccount: account")) {
  console.error("CutFlow safety check failed: appointment checkout must remain a direct charge on the barber's Stripe account.");
  process.exit(1);
}

if (found.length) {
  console.error(`CutFlow safety check failed: appointment checkout contains platform-fee routing fields: ${found.join(", ")}`);
  process.exit(1);
}

console.log("CutFlow appointment-fee check passed: no CutFlow application fee is configured.");
