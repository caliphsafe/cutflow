import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { BookingWizard } from "@/components/BookingWizard";
import { StorefrontIdentity } from "@/components/StorefrontIdentity";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { getPublicBarber } from "@/lib/public-data";

export default async function BarberStorefront({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string; service?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  let ownerPreview = false;
  if (query.preview === "1") {
    const context = await getAuthenticatedBarber();
    ownerPreview = Boolean(context.user && context.barber?.slug === slug);
  }
  const data = await getPublicBarber(slug, { ownerPreview });
  if (!data) notFound();
  const { barber, services, products } = data;
  const hasGallery = Boolean(barber.galleryImageUrls?.length);

  return <main className="storefront-site booking-first-storefront" style={{ "--barber-accent": barber.accent } as CSSProperties}>
    {ownerPreview && <div className="storefront-preview-banner"><div><Eye/><span><b>Private storefront preview</b><small>Explore the booking experience. Checkout is disabled in this preview.</small></span></div><Link href="/dashboard/storefront">Back to editor</Link></div>}
    <nav className="storefront-nav" aria-label="Storefront">
      <a href="#booking" className="storefront-wordmark">{barber.logoImageUrl && <img src={barber.logoImageUrl} alt=""/>}<span>{barber.shopName}</span></a>
      <div>{hasGallery && <a href="#gallery">The work</a>}<a href="#visit">Visit</a><a className="button small" href="#booking">Book now</a></div>
    </nav>
    <div className="storefront-content">
      <StorefrontIdentity barber={barber}/>
      <section id="booking" className="storefront-booking" aria-label="Book an appointment">
        <BookingWizard embedded preview={ownerPreview} barber={barber} serviceItems={services} productItems={products} initialServiceId={query.service || ""}/>
      </section>
      {hasGallery && <section id="gallery" className="storefront-work" aria-labelledby="gallery-title">
        <header><div><p className="eyebrow">FROM THE CHAIR</p><h2 id="gallery-title">The work.</h2></div><a href="#booking">Book your next cut</a></header>
        <div className="storefront-gallery">{barber.galleryImageUrls!.slice(0, 8).map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" aria-label={`View work photo ${index + 1} full size`}><img src={url} alt={`${barber.shopName} haircut ${index + 1}`} loading="lazy"/></a>)}</div>
      </section>}
      <section id="visit" className="storefront-visit">
        <div><p className="eyebrow">YOUR BARBER</p><h2>{barber.displayName}</h2>{barber.bio && <p>{barber.bio}</p>}<address>{[barber.address, barber.city].filter(Boolean).join(", ")}</address><div className="storefront-contact">{barber.phone && <a href={`tel:${barber.phone}`}>{barber.phone}</a>}{barber.email && <a href={`mailto:${barber.email}`}>Email the shop</a>}</div></div>
        {barber.shopImageUrl && <img src={barber.shopImageUrl} alt={`Inside ${barber.shopName}`} loading="lazy"/>}
      </section>
      <footer className="storefront-simple-footer"><span>{barber.shopName}</span><Link href="/">Booking powered by CutFlow</Link></footer>
    </div>
  </main>;
}
