import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookingWizard } from "@/components/BookingWizard";
import { getPublicBarber } from "@/lib/public-data";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getPublicBarber(slug);
  if (!data) notFound();
  const { barber, services, products } = data;
  return <main className="standalone-booking"><header><Link href={`/b/${slug}`}><ArrowLeft/> Back to {barber.shopName}</Link><div><b>{barber.shopName}</b><small>Secure booking</small></div><span>$10 deposit</span></header><BookingWizard barber={barber} serviceItems={services} productItems={products} initialServiceId={query.service || ""}/></main>;
}
