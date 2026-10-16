import { MapPin } from "lucide-react";
import type { Barber } from "@/lib/types";

type StorefrontIdentityProps = Pick<Barber, "shopName" | "displayName" | "headline" | "city" | "address" | "acceptingBookings" | "profileImageUrl" | "logoImageUrl" | "coverImageUrl">;

export function StorefrontIdentity({ barber }: { barber: StorefrontIdentityProps }) {
  const image = barber.profileImageUrl || barber.logoImageUrl;
  return <header className="storefront-identity">
    {barber.coverImageUrl && <img className="storefront-cover" src={barber.coverImageUrl} alt=""/>}
    <div className="storefront-identity-body">
      <span className="storefront-avatar">{image ? <img src={image} alt={barber.displayName || barber.shopName}/> : (barber.displayName || barber.shopName || "Your studio").split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
      <div><p className="storefront-booking-status">{barber.acceptingBookings ? "Accepting appointments" : "Bookings paused"}</p><h1>{barber.shopName || "Your studio"}</h1>{barber.headline && <p className="storefront-tagline">{barber.headline}</p>}<p className="storefront-location"><MapPin size={14}/>{[barber.address, barber.city].filter(Boolean).join(", ") || "Location shared by your barber"}</p></div>
    </div>
  </header>;
}
