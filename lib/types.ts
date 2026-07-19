export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  category: string;
  active: boolean;
  addOns?: string[];
  imageUrl?: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  inventory: number;
  textureTags: string[];
  serviceTags: string[];
  pickupOnly: boolean;
  active: boolean;
  imageUrl?: string;
};

export type Barber = {
  id: string;
  slug: string;
  displayName: string;
  shopName: string;
  headline: string;
  bio: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  accent: string;
  stripeConnected: boolean;
  acceptingBookings: boolean;
  depositCents?: number;
  primaryPaymentProvider?: "stripe" | "square" | "paypal" | null;
  paymentOptions?: PaymentOption[];
  profileImageUrl?: string;
  coverImageUrl?: string;
  shopImageUrl?: string;
  logoImageUrl?: string;
  galleryImageUrls?: string[];
};

export type PaymentOption = {
  provider: "stripe" | "square" | "paypal";
  label: string;
  methods: string[];
};

export type BookingStatus =
  | "pending_deposit"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type Booking = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  paymentStatus: "deposit_due" | "deposit_paid" | "paid" | "refunded";
  haircutRequest: HaircutRequest;
  productIds: string[];
  notes?: string;
};

export type HaircutRequest = {
  texture: string;
  currentLength: string;
  desiredStyle: string;
  sides: string;
  top: string;
  lineUp: boolean;
  beard: string;
  enhancements: boolean;
  sensitivity: string;
  referenceNote: string;
  repeatLastRequest: boolean;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  visits: number;
  lifetimeValueCents: number;
  lastVisit: string;
  texture: string;
  preferredStyle: string;
  allergies: string;
  notes: string;
  lastRequest: HaircutRequest;
};

export type Transaction = {
  id: string;
  bookingId?: string;
  customerName: string;
  date: string;
  type: "deposit" | "service_balance" | "product" | "tip" | "refund" | "cash" | "adjustment";
  grossCents: number;
  taxCents: number;
  processorFeeCents: number;
  netCents: number;
  method: string;
  status: "paid" | "refunded" | "pending" | "failed" | "partially_refunded";
};
