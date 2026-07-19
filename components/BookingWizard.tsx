"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  WalletCards,
  Info,
  MapPin,
  PackageCheck,
  Scissors,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoBarber, products as demoProducts, services as demoServices } from "@/lib/demo-data";
import { money } from "@/lib/format";
import type { Barber, HaircutRequest, Product, Service } from "@/lib/types";

const textureOptions = ["Straight", "2A", "2B", "2C", "3A", "3B", "3C", "4A", "4B", "4C", "Not sure"];
const lengthOptions = ["Very short / buzzed", "Short / 1–2 inches", "Medium / 2–5 inches", "Long / 5+ inches", "Locs / braids / twists"];

const blankRequest: HaircutRequest = {
  texture: "",
  currentLength: "",
  desiredStyle: "",
  sides: "",
  top: "",
  lineUp: true,
  beard: "No beard service",
  enhancements: false,
  sensitivity: "",
  referenceNote: "",
  repeatLastRequest: false,
};

type BookingWizardProps = {
  embedded?: boolean;
  barber?: Barber;
  serviceItems?: Service[];
  productItems?: Product[];
  initialServiceId?: string;
};

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatLongDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function availableDays() {
  const output: Date[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (output.length < 12) {
    if (cursor.getDay() !== 0) output.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return output;
}

function fallbackSlots(date: Date, service?: Service) {
  const weekday = date.getDay();
  const hours: Record<number, [number, number]> = {
    1: [9, 18], 2: [9, 18], 3: [10, 19], 4: [10, 20], 5: [9, 20], 6: [8, 17],
  };
  const range = hours[weekday];
  if (!range) return [];
  const duration = service?.durationMinutes || 45;
  const times: string[] = [];
  for (let minutes = range[0] * 60; minutes + duration <= range[1] * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (!["11:30", "13:00", "15:30"].includes(value)) times.push(value);
  }
  return times;
}

function humanTime(value: string) {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function productMatches(product: Product, serviceId: string, texture: string) {
  const serviceMatch = product.serviceTags.includes(serviceId);
  const textureMatch = product.textureTags.includes("all") || product.textureTags.includes(texture);
  return serviceMatch && textureMatch;
}

export function BookingWizard({
  embedded = false,
  barber: barberProp,
  serviceItems,
  productItems,
  initialServiceId = "",
}: BookingWizardProps) {
  const barber = barberProp || demoBarber;
  const services = serviceItems?.length ? serviceItems : demoServices;
  const products = productItems || demoProducts;
  const validInitialService = services.some((item) => item.id === initialServiceId) ? initialServiceId : "";

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(validInitialService);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [request, setRequest] = useState<HaircutRequest>(blankRequest);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", smsConsent: false });
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [savedRequest, setSavedRequest] = useState<HaircutRequest | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [liveSlots, setLiveSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((item) => item.id === serviceId);
  const days = useMemo(() => availableDays(), []);
  const slots = liveSlots ?? (selectedDate ? fallbackSlots(selectedDate, service) : []);
  const selectedProductData = products.filter((product) => selectedProducts.includes(product.id));
  const productTotal = selectedProductData.reduce((sum, product) => sum + product.priceCents, 0);
  const total = (service?.priceCents || 0) + productTotal;
  const deposit = barber.depositCents ?? 1000;
  const paymentOptions = barber.paymentOptions?.length ? barber.paymentOptions : [{ provider: "stripe" as const, label: "Card or digital wallet", methods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"] }];
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "square" | "paypal">((barber.primaryPaymentProvider || paymentOptions[0]?.provider || "stripe") as "stripe" | "square" | "paypal");
  const dueAtShop = Math.max(0, total - deposit);

  const recommendations = products.filter((product) =>
    service ? productMatches(product, service.id, request.texture) : false,
  );

  useEffect(() => {
    setSelectedTime("");
    if (!selectedDate || !service) {
      setLiveSlots(null);
      return;
    }

    const controller = new AbortController();
    setSlotsLoading(true);
    const params = new URLSearchParams({
      barberSlug: barber.slug,
      serviceId: service.id,
      date: toDateKey(selectedDate),
    });

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability unavailable");
        return response.json();
      })
      .then((data) => setLiveSlots(Array.isArray(data.slots) ? data.slots : null))
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") return;
        setLiveSlots(null);
      })
      .finally(() => setSlotsLoading(false));

    return () => controller.abort();
  }, [barber.slug, selectedDate, service]);

  async function identifyReturningCustomer() {
    if (!customer.email.trim() || !customer.phone.trim()) return;
    setLookupLoading(true);
    try {
      const response = await fetch("/api/clients/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberSlug: barber.slug, email: customer.email, phone: customer.phone }),
      });
      const data = await response.json();
      if (!data.found || !data.client) {
        setExistingCustomerId(null);
        setSavedRequest(null);
        return;
      }
      setExistingCustomerId(data.client.id);
      setSavedRequest({ ...blankRequest, ...(data.client.lastRequest || {}) });
      setCustomer((current) => ({ ...current, name: data.client.name, email: data.client.email, phone: data.client.phone }));
    } finally {
      setLookupLoading(false);
    }
  }

  function reuseLastRequest() {
    if (!savedRequest) return;
    setRequest({ ...savedRequest, repeatLastRequest: true });
  }

  function toggleProduct(id: string) {
    setSelectedProducts((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function canContinue() {
    if (step === 1) return Boolean(customer.name && customer.email && customer.phone);
    if (step === 2) return Boolean(service);
    if (step === 3) return Boolean(selectedDate && selectedTime);
    if (step === 4) return Boolean(request.texture && request.currentLength && request.desiredStyle);
    return true;
  }

  async function submitBooking() {
    if (!service || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/bookings/create-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberSlug: barber.slug,
          serviceId: service.id,
          selectedDate: toDateKey(selectedDate),
          selectedTime,
          customer,
          haircutRequest: request,
          productIds: selectedProducts,
          paymentProvider,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create booking.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create booking.");
      setSubmitting(false);
    }
  }

  return (
    <section className={embedded ? "booking-engine embedded" : "booking-engine"}>
      <div className="booking-progress" aria-label={`Step ${step} of 5`}>
        {[1, 2, 3, 4, 5].map((item) => (
          <span key={item} className={item <= step ? "active" : ""}><i /></span>
        ))}
      </div>

      <div className="booking-grid">
        <div className="booking-workspace glass-card">
          {step === 1 && (
            <div className="booking-step">
              <div className="step-heading">
                <span className="step-icon"><UserRound size={20} /></span>
                <div><small>STEP 1 OF 5</small><h2>Let’s find your chair profile.</h2><p>Returning clients can reuse their saved haircut details in one tap.</p></div>
              </div>

              <div className="form-grid two">
                <label><span>Full name</span><input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Your full name" /></label>
                <label><span>Mobile number</span><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} onBlur={identifyReturningCustomer} placeholder="(508) 555-0123" inputMode="tel" /></label>
                <label className="full"><span>Email</span><input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} onBlur={identifyReturningCustomer} placeholder="you@example.com" type="email" /></label>
                <label className="full consent-check"><input type="checkbox" checked={customer.smsConsent} onChange={(event) => setCustomer({ ...customer, smsConsent: event.target.checked })} /><span><b>Text me appointment updates</b><small>Booking confirmations and reminders only. Message rates may apply.</small></span></label>
              </div>

              {lookupLoading && <div className="privacy-note"><Clock3 size={16} /><span>Checking for your saved chair profile…</span></div>}
              {existingCustomerId && (
                <div className="returning-card">
                  <span><CheckCircle2 size={18} /></span>
                  <div><b>Welcome back, {customer.name.split(" ")[0]}.</b><p>Your last cut request and preferences are ready.</p></div>
                  <button onClick={reuseLastRequest}>Use last request</button>
                </div>
              )}

              <div className="privacy-note"><Info size={16} /><span>Your contact information is shared only with this barber and used for appointment communication.</span></div>
            </div>
          )}

          {step === 2 && (
            <div className="booking-step">
              <div className="step-heading">
                <span className="step-icon"><Scissors size={20} /></span>
                <div><small>STEP 2 OF 5</small><h2>Select a service.</h2><p>Review the full price and appointment length before choosing a time.</p></div>
              </div>
              <div className="service-choice-grid">
                {services.filter((item) => item.active).map((item) => (
                  <button key={item.id} className={serviceId === item.id ? "service-choice selected" : "service-choice"} onClick={() => setServiceId(item.id)}>
                    <span className="choice-check">{serviceId === item.id && <Check size={14} />}</span>
                    {item.imageUrl && <span className="service-choice-photo"><img src={item.imageUrl} alt="" /></span>}
                    <div><small>{item.category}</small><b>{item.name}</b><p>{item.description}</p></div>
                    <footer><span><Clock3 size={14} /> {item.durationMinutes} min</span><strong>{money(item.priceCents)}</strong></footer>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="booking-step">
              <div className="step-heading">
                <span className="step-icon"><CalendarDays size={20} /></span>
                <div><small>STEP 3 OF 5</small><h2>Select your appointment time.</h2><p>Choose an available date, then select the exact start time that works best for you.</p></div>
              </div>
              <div className="date-selector-header"><span>Available dates</span><small>Times are shown in {barber.city || "the barber’s local time"}</small></div>
              <div className="day-scroller" role="list" aria-label="Available appointment dates">
                {days.map((date) => {
                  const selected = selectedDate && toDateKey(selectedDate) === toDateKey(date);
                  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
                  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
                  return <button type="button" key={toDateKey(date)} className={selected ? "day-card selected" : "day-card"} aria-pressed={Boolean(selected)} aria-label={formatLongDay(date)} onClick={() => setSelectedDate(date)}>
                    <span className="day-card-weekday">{weekday}</span>
                    <span className="day-card-number">{date.getDate()}</span>
                    <span className="day-card-month">{month}</span>
                    {selected && <span className="day-card-check"><Check size={13}/></span>}
                  </button>;
                })}
              </div>
              {selectedDate ? (
                <div className="time-panel">
                  <header><div className="selected-date-heading"><span className="selected-date-calendar"><small>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(selectedDate)}</small><b>{selectedDate.getDate()}</b></span><span><b>{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(selectedDate)}</b><small>{service?.durationMinutes || 45}-minute appointment</small></span></div><span className="opening-count">{slotsLoading ? "Checking availability…" : `${slots.length} ${slots.length === 1 ? "time" : "times"} available`}</span></header>
                  {slotsLoading ? (
                    <div className="empty-selection"><Clock3 size={24} /><p>Checking live availability…</p></div>
                  ) : slots.length ? (
                    <div className="time-grid">
                      {slots.map((time) => <button key={time} className={selectedTime === time ? "selected" : ""} onClick={() => setSelectedTime(time)}>{humanTime(time)}</button>)}
                    </div>
                  ) : (
                    <div className="empty-selection"><CalendarDays size={24} /><p>No openings remain on this date. Choose another day.</p></div>
                  )}
                </div>
              ) : <div className="empty-selection date-empty"><CalendarDays size={24} /><div><b>Choose an available date</b><p>Appointment times will appear here after you select a date.</p></div></div>}
            </div>
          )}

          {step === 4 && (
            <div className="booking-step">
              <div className="step-heading">
                <span className="step-icon"><Sparkles size={20} /></span>
                <div><small>STEP 4 OF 5</small><h2>Tell your barber what you need.</h2><p>Your preferences are saved securely so returning appointments are faster to book.</p></div>
              </div>

              {existingCustomerId && !request.repeatLastRequest && (
                <button className="reuse-request-banner" onClick={reuseLastRequest}><span><Sparkles size={18} /></span><div><b>Repeat your last haircut request?</b><small>Load every saved detail, then change only what is different.</small></div><ArrowRight size={18} /></button>
              )}

              <div className="form-grid two detailed-request">
                <label><span>Hair texture</span><select value={request.texture} onChange={(event) => setRequest({ ...request, texture: event.target.value })}><option value="">Choose texture</option>{textureOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Current length</span><select value={request.currentLength} onChange={(event) => setRequest({ ...request, currentLength: event.target.value })}><option value="">Choose length</option>{lengthOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="full"><span>Requested style</span><input value={request.desiredStyle} onChange={(event) => setRequest({ ...request, desiredStyle: event.target.value })} placeholder="Example: low taper with textured top" /></label>
                <label><span>Sides and back</span><textarea value={request.sides} onChange={(event) => setRequest({ ...request, sides: event.target.value })} placeholder="Fade height, taper, darkness, neckline…" /></label>
                <label><span>Top</span><textarea value={request.top} onChange={(event) => setRequest({ ...request, top: event.target.value })} placeholder="Length to keep, scissor work, curl shape…" /></label>
                <label><span>Beard request</span><input value={request.beard} onChange={(event) => setRequest({ ...request, beard: event.target.value })} /></label>
                <label><span>Sensitivity / product notes</span><input value={request.sensitivity} onChange={(event) => setRequest({ ...request, sensitivity: event.target.value })} placeholder="Sensitive areas, allergies, preferences" /></label>
                <label className="full"><span>Reference note</span><textarea value={request.referenceNote} onChange={(event) => setRequest({ ...request, referenceNote: event.target.value })} placeholder="Anything your barber should know before you arrive?" /></label>
              </div>
              <div className="toggle-row">
                <label><input type="checkbox" checked={request.lineUp} onChange={(event) => setRequest({ ...request, lineUp: event.target.checked })} /><span><b>Include line-up</b><small>Hairline, temple and neck detail.</small></span></label>
                <label><input type="checkbox" checked={request.enhancements} onChange={(event) => setRequest({ ...request, enhancements: event.target.checked })} /><span><b>Enhancements requested</b><small>Barber confirms suitability during consultation.</small></span></label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="booking-step">
              <div className="step-heading">
                <span className="step-icon"><PackageCheck size={20} /></span>
                <div><small>STEP 5 OF 5</small><h2>Review and reserve your appointment.</h2><p>Add any pickup products, choose a payment service, and complete the {money(deposit)} reservation deposit.</p></div>
              </div>

              {recommendations.length > 0 && (
                <div className="recommendation-section">
                  <div className="recommendation-title"><div><span>SMART PICKUP SUGGESTIONS</span><h3>Matched to {request.texture} texture + {service?.name}</h3></div><Sparkles size={20} /></div>
                  <div className="product-choice-grid">
                    {recommendations.map((product) => (
                      <button key={product.id} className={selectedProducts.includes(product.id) ? "product-choice selected" : "product-choice"} onClick={() => toggleProduct(product.id)}>
                        {product.imageUrl ? <span className="product-orb has-photo"><img src={product.imageUrl} alt="" /></span> : <span className="product-orb">{product.name.slice(0, 1)}</span>}
                        <div><b>{product.name}</b><p>{product.description}</p><small>Pickup at appointment · {product.inventory} left</small></div>
                        <strong>{money(product.priceCents)}</strong>
                        <span className="choice-check">{selectedProducts.includes(product.id) && <Check size={14} />}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="final-review-card">
                <div><span>CLIENT</span><b>{customer.name}</b><small>{customer.email} · {customer.phone}</small></div>
                <div><span>APPOINTMENT</span><b>{service?.name}</b><small>{selectedDate ? formatLongDay(selectedDate) : ""} at {humanTime(selectedTime)}</small></div>
                <div><span>REQUEST</span><b>{request.desiredStyle}</b><small>{request.texture} texture · {request.currentLength}</small></div>
                <div><span>PRODUCT PICKUP</span><b>{selectedProductData.length ? selectedProductData.map((item) => item.name).join(", ") : "No products added"}</b><small>{selectedProductData.length ? money(productTotal) : "You can add products at the shop later."}</small></div>
              </div>

              <div className="payment-method-section">
                <div className="recommendation-title"><div><span>PAYMENT SERVICE</span><h3>Choose the secure checkout you prefer.</h3></div><WalletCards size={20} /></div>
                <div className="payment-option-grid">
                  {paymentOptions.map((option) => (
                    <button type="button" key={option.provider} className={paymentProvider === option.provider ? "payment-option selected" : "payment-option"} onClick={() => setPaymentProvider(option.provider)}>
                      <span className="choice-check">{paymentProvider === option.provider && <Check size={14} />}</span>
                      <div><b>{option.label}</b><small>{option.methods.join(" · ")}</small></div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="deposit-explainer">
                <CreditCard size={20} />
                <div><b>{money(deposit)} is charged now to reserve your chair.</b><p>It is automatically deducted from your final appointment total. The remaining {money(dueAtShop)} is due to {barber.displayName} at the shop.</p></div>
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
          )}

          <footer className="booking-actions">
            <button className="button secondary" disabled={step === 1 || submitting} onClick={() => setStep((current) => Math.max(1, current - 1))}><ArrowLeft size={17} /> Back</button>
            {step < 5 ? (
              <button className="button" disabled={!canContinue()} onClick={() => setStep((current) => Math.min(5, current + 1))}>Continue <ArrowRight size={17} /></button>
            ) : (
              <button className="button deposit-button" disabled={submitting} onClick={submitBooking}>{submitting ? "Opening secure checkout…" : `${money(deposit)} deposit & confirm`} <ArrowRight size={17} /></button>
            )}
          </footer>
        </div>

        <aside className="booking-summary glass-card">
          <div className="summary-barber">
            <span className={barber.profileImageUrl ? "barber-portrait has-photo" : "barber-portrait"}>{barber.profileImageUrl ? <img src={barber.profileImageUrl} alt=""/> : barber.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div><small>BOOKING WITH</small><b>{barber.displayName}</b><span>{barber.shopName}</span></div>
          </div>
          <div className="summary-line"><MapPin size={16} /><span>{barber.address}<br />{barber.city}</span></div>
          <hr />
          <div className="summary-item"><span>Service</span><b>{service?.name || "Not selected"}</b></div>
          <div className="summary-item"><span>Date</span><b>{selectedDate ? formatDay(selectedDate) : "Not selected"}</b></div>
          <div className="summary-item"><span>Start time</span><b>{selectedTime ? humanTime(selectedTime) : "Not selected"}</b></div>
          <div className="summary-item"><span>Duration</span><b>{service ? `${service.durationMinutes} min` : "—"}</b></div>
          <hr />
          <div className="summary-item"><span>Service</span><b>{money(service?.priceCents || 0)}</b></div>
          <div className="summary-item"><span>Pickup products</span><b>{money(productTotal)}</b></div>
          <div className="summary-item total"><span>Appointment total</span><b>{money(total)}</b></div>
          <div className="summary-deposit"><span>Due now</span><strong>{money(deposit)}</strong><small>Applied to total</small></div>
          <div className="summary-due"><span>Due at shop</span><b>{money(dueAtShop)}</b></div>
          <div className="summary-secure"><CreditCard size={15} /><span>Secure payment directly to the barber</span></div>
        </aside>
      </div>
    </section>
  );
}
