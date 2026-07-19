import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck2, Check, Clock3, Camera, MapPin, Scissors, ShieldCheck, Sparkles, Star } from "lucide-react";
import { BookingWizard } from "@/components/BookingWizard";
import { money } from "@/lib/format";
import { getPublicBarber } from "@/lib/public-data";

export default async function BarberStorefront({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicBarber(slug);
  if (!data) notFound();
  const { barber, services, products } = data;
  const initials = barber.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="storefront-site" style={{ "--barber-accent": barber.accent } as CSSProperties}>
      <nav className="storefront-nav"><Link href={`/b/${slug}`} className="storefront-wordmark">{barber.shopName}</Link><div><a href="#services">Services</a><a href="#products">Products</a><a href="#about">About</a><Link className="button small" href={`/book/${slug}`}>Book now</Link></div></nav>

      <section className="storefront-hero">
        <div className="storefront-hero-copy"><p className="eyebrow">PRIVATE BARBERING · CLEAR BOOKING</p><h1>{barber.headline}</h1><p>{barber.bio}</p><div className="storefront-actions"><Link className="button large" href={`/book/${slug}`}>Find a time <ArrowRight size={18}/></Link><a className="button large secondary" href="#services">View services</a></div><div className="storefront-proof"><span><ShieldCheck/>$10 deposit applied to total</span><span><CalendarCheck2/>Exact date and time</span><span><Sparkles/>Preferences remembered</span></div></div>
        <div className="barber-art"><div className="barber-art-frame"><div className="portrait-shape"><span>{initials}</span></div><div className="portrait-caption"><span>BARBER / OWNER</span><b>{barber.displayName}</b></div></div><div className="rating-card glass-card"><Star fill="currentColor"/><b>4.9</b><span>Built for repeat clients</span></div><div className="next-card glass-card"><Clock3/><div><small>BOOKING STATUS</small><b>{barber.acceptingBookings ? "Accepting appointments" : "Bookings paused"}</b></div></div></div>
      </section>

      <section className="storefront-facts"><div><MapPin/><span><small>LOCATION</small><b>{barber.address}, {barber.city}</b></span></div><div><Clock3/><span><small>AVAILABILITY</small><b>Live times shown while booking</b></span></div><div><Scissors/><span><small>EXPERIENCE</small><b>Cut details saved for next time</b></span></div></section>

      <section id="services" className="storefront-section service-menu"><header><div><p className="eyebrow">SERVICES</p><h2>Book the time your cut actually needs.</h2></div><p>Every option shows the full price and appointment length. A $10 deposit reserves the time and comes off the final balance.</p></header><div className="store-service-list">{services.map((service,index)=><article key={service.id}><span>{String(index+1).padStart(2,"0")}</span><div><small>{service.category}</small><h3>{service.name}</h3><p>{service.description}</p></div><div><span><Clock3/> {service.durationMinutes} min</span><strong>{money(service.priceCents)}</strong><Link href={`/book/${slug}?service=${service.id}`}>Book <ArrowRight/></Link></div></article>)}</div></section>

      <section id="about" className="storefront-about"><div className="about-art"><span>CONSISTENCY<br/>LIVES IN<br/>THE DETAILS.</span></div><div><p className="eyebrow">THE EXPERIENCE</p><h2>Your next appointment begins with what we learned at the last one.</h2><p>Cut preferences, texture, sensitivities and styling notes can stay on your private customer profile. Returning clients can reuse the last request and change only what is different.</p><ul><li><Check/>Your barber sees the request before you arrive.</li><li><Check/>Exact start time and duration are always clear.</li><li><Check/>Product suggestions reflect your texture and service.</li></ul><Link className="button secondary" href={`/book/${slug}`}>Book your chair</Link></div></section>

      <section id="products" className="storefront-section product-shelf"><header><div><p className="eyebrow">SHOP PICKUP</p><h2>Take the finish home.</h2></div><p>Add matched products while booking and pick them up at the appointment. No shipping, no guessing.</p></header><div className="store-product-grid">{products.map((product,index)=><article key={product.id}><div className={`product-art art-${(index%4)+1}`}><span>{product.name.slice(0,1)}</span><small>CARE / PICKUP</small></div><div><small>PICKUP ONLY · {product.inventory} IN STOCK</small><h3>{product.name}</h3><p>{product.description}</p><footer><b>{money(product.priceCents)}</b><Link href={`/book/${slug}`}>Add while booking</Link></footer></div></article>)}</div></section>

      <section className="booking-embed-section"><header><p className="eyebrow">BOOK WITHOUT THE BACK-AND-FORTH</p><h2>Your exact appointment, request and deposit in one flow.</h2></header><BookingWizard embedded barber={barber} serviceItems={services} productItems={products}/></section>

      <footer className="storefront-footer"><div><b>{barber.shopName}</b><p>{barber.address}<br/>{barber.city}</p></div><div><a href={`tel:${barber.phone}`}>{barber.phone}</a><a href={`mailto:${barber.email}`}>{barber.email}</a><a href="#"><Camera/> Instagram</a></div><div><small>BOOKING POWERED BY</small><Link href="/">CutFlow</Link></div></footer>
    </main>
  );
}
