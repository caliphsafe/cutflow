import { notFound } from "next/navigation";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import { getCustomerPortalBooking } from "@/lib/customer-portal";
export default async function ManageBookingPage({params}:{params:Promise<{token:string}>}){const{token}=await params;const data=await getCustomerPortalBooking(token);if(!data)notFound();return <CustomerPortal token={token} data={data}/>}
