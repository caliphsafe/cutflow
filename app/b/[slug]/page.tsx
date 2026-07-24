import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck2, Check, Clock3, Eye as EyeIcon, MapPin, Scissors, ShieldCheck, Sparkles, Star } from "lucide-react";
import { BookingWizard } from "@/components/BookingWizard";
import { money } from "@/lib/format";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { getPublicBarber } from "@/lib/public-data";

export default async function BarberStorefront({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
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
  const initials = barber.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const heroStyle = barber.coverImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(14,15,15,.94) 0%, rgba(14,15,15,.78) 45%, rgba(14,15,15,.2) 100%), url(${barber.coverImageUrl})` } : undefined;

  return (
    <main className={ownerPreview ? "storefront-site preview-mode" : "storefront-site"} style={{ "--barber-accent": barber.accent } as CSSProperties}>
      {ownerPreview && <div className="storefront-preview-banner"><div><EyeIcon/><span><b>Private storefront preview</b><small>Only you can see this unpublished preview. Booking and checkout are disabled until the storefront is published.</small></span></div><Link href="/dashboard/storefront">Back to storefront editor</Link></div>}
      <nav className="storefront-nav">
        <Link href={ownerPreview ? `/b/${slug}?preview=1` : `/b/${slug}`} className="storefront-wordmark">{barber.logoImageUrl ? <img src={barber.logoImageUrl} alt={`${barber.shopName} logo`}/> : null}<span>{barber.shopName}</span></Link>
        <div><a href="#services">Services</a><a href="#products">Products</a><a href="#about">About</a><Link className="button small" href={ownerPreview ? "#services" : `/book/${slug}`}>Book now</Link></div>
      </nav>

      <section className={barber.coverImageUrl ? "storefront-hero has-cover" : "storefront-hero"} style={heroStyle}>
        <div className="storefront-hero-copy"><p className="eyebrow">PROFESSIONAL BARBERING · EASY ONLINE BOOKING</p><h1>{barber.headline}</h1><p>{barber.bio}</p><div className="storefront-actions"><Link className="button large" href={ownerPreview ? "#services" : `/book/${slug}`}>Book an appointment <ArrowRight size={18}/></Link><a className="button large secondary" href="#services">View services</a></div><div className="storefront-proof"><span><ShieldCheck/>{money(barber.depositCents ?? 1000)} deposit credited to your total</span><span><CalendarCheck2/>Confirmed date and time</span><span><Sparkles/>Preferences saved for return visits</span></div></div>
        <div className="barber-art"><div className="barber-art-frame"><div className={barber.profileImageUrl ? "portrait-shape has-photo" : "portrait-shape"}>{barber.profileImageUrl ? <img src={barber.profileImageUrl} alt={`${barber.displayName}, barber`}/> : <span>{initials}</span>}</div><div className="portrait-caption"><span>BARBER / OWNER</span><b>{barber.displayName}</b></div></div><div className="rating-card glass-card"><Star fill="currentColor"/><b>4.9</b><span>Built for repeat clients</span></div><div className="next-card glass-card"><Clock3/><div><small>BOOKING STATUS</small><b>{barber.acceptingBookings ? "Accepting appointments" : "Bookings paused"}</b></div></div></div>
      </section>

      <section className="storefront-facts"><div><MapPin/><span><small>LOCATION</small><b>{barber.address}, {barber.city}</b></span></div><div><Clock3/><span><small>AVAILABILITY</small><b>Live times shown while booking</b></span></div><div><Scissors/><span><small>EXPERIENCE</small><b>Cut details saved for next time</b></span></div></section>

      <section id="services" className="storefront-section service-menu"><header><div><p className="eyebrow">SERVICES</p><h2>Choose the right service for your appointment.</h2></div><p>Each service shows its full price and expected appointment length. A {money(barber.depositCents ?? 1000)} deposit reserves the time and is credited toward the final balance.</p></header><div className="store-service-list">{services.map((service,index)=><article className={service.imageUrl ? "has-service-photo" : ""} key={service.id}>{service.imageUrl ? <img className="service-menu-photo" src={service.imageUrl} alt={service.name}/> : <span>{String(index+1).padStart(2,"0")}</span>}<div><small>{service.category}</small><h3>{service.name}</h3><p>{service.description}</p></div><div><span><Clock3/> {service.durationMinutes} min</span><strong>{money(service.priceCents)}</strong><Link href={ownerPreview ? "#services" : `/book/${slug}?service=${service.id}`}>Book <ArrowRight/></Link></div></article>)}</div></section>

      <section id="about" className="storefront-about"><div className={barber.shopImageUrl ? "about-art has-shop-photo" : "about-art"}>{barber.shopImageUrl ? <img src={barber.shopImageUrl} alt={`${barber.shopName} shop interior`}/> : <span>CONSISTENCY<br/>LIVES IN<br/>THE DETAILS.</span>}</div><div><p className="eyebrow">THE EXPERIENCE</p><h2>A better appointment starts before you arrive.</h2><p>Save your cut preferences, texture, sensitivities and styling notes to a private customer profile. Returning clients can reuse a previous request and update only what has changed.</p><ul><li><Check/>Your barber sees the request before you arrive.</li><li><Check/>Exact start time and duration are always clear.</li><li><Check/>Product suggestions reflect your texture and service.</li></ul><Link className="button secondary" href={ownerPreview ? "#services" : `/book/${slug}`}>Book your chair</Link></div></section>

      {barber.galleryImageUrls?.length ? <section className="storefront-section work-gallery"><header><div><p className="eyebrow">SELECTED WORK</p><h2>Details from the chair.</h2></div><p>A closer look at finished cuts, styling and the environment customers can expect.</p></header><div className="work-gallery-grid">{barber.galleryImageUrls.slice(0,8).map((url,index)=><figure key={`${url}-${index}`}><img src={url} alt={`${barber.shopName} work example ${index+1}`}/></figure>)}</div></section> : null}

      <section id="products" className="storefront-section product-shelf"><header><div><p className="eyebrow">SHOP PICKUP</p><h2>Keep your style looking fresh between visits.</h2></div><p>Add recommended products while booking and pick them up at your appointment.</p></header><div className="store-product-grid">{products.map((product,index)=><article key={product.id}><div className={product.imageUrl ? "product-art has-product-photo" : `product-art art-${(index%4)+1}`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> : <><span>{product.name.slice(0,1)}</span><small>CARE / PICKUP</small></>}</div><div><small>PICKUP ONLY · {product.inventory} IN STOCK</small><h3>{product.name}</h3><p>{product.description}</p><footer><b>{money(product.priceCents)}</b><Link href={ownerPreview ? "#products" : `/book/${slug}`}>Add while booking</Link></footer></div></article>)}</div></section>

      <section className="booking-embed-section"><header><p className="eyebrow">BOOK IN A FEW SIMPLE STEPS</p><h2>Choose your service, appointment time and preferences, then complete your deposit securely.</h2></header>{ownerPreview ? <div className="private-preview-booking"><EyeIcon/><div><b>Booking is disabled in private preview.</b><p>Publish the storefront when the launch checklist is complete. Customers will then be able to select a service, time and secure deposit.</p></div><Link className="button secondary" href="/dashboard/storefront">Return to editor</Link></div> : <BookingWizard embedded barber={barber} serviceItems={services} productItems={products}/>}</section>

      <footer className="storefront-footer"><div>{barber.logoImageUrl ? <img className="footer-shop-logo" src={barber.logoImageUrl} alt=""/> : null}<b>{barber.shopName}</b><p>{barber.address}<br/>{barber.city}</p></div><div><a href={`tel:${barber.phone}`}>{barber.phone}</a><a href={`mailto:${barber.email}`}>{barber.email}</a></div><div><small>BOOKING POWERED BY</small><Link href="/">CutFlow</Link></div></footer>
    </main>
  );
}
