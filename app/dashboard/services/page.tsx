"use client";

import { Clock3, GripVertical, Plus, Save, Scissors, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HelpTip } from "@/components/HelpTip";
import { MediaUploader } from "@/components/MediaUploader";
import { services as seedServices } from "@/lib/demo-data";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>(seedServices);
  const [barberId, setBarberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/data?resource=services").then((response) => response.json()),
      fetch("/api/dashboard/data?resource=profile").then((response) => response.json()),
    ]).then(([servicePayload, profilePayload]) => {
      if (Array.isArray(servicePayload.data) && servicePayload.data.length) setItems(servicePayload.data);
      if (profilePayload.data?.id) setBarberId(profilePayload.data.id);
    }).catch(() => undefined);
  }, []);

  function update(id: string, field: keyof Service, value: string | boolean) {
    setSaved(false);
    setItems((current) => current.map((item) => item.id === id ? {
      ...item,
      [field]: field === "durationMinutes" ? Number(value) : field === "priceCents" ? Math.round(Number(value) * 100) : value,
    } : item));
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/dashboard/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "services", items }) });
    const payload = await response.json();
    if (response.ok && Array.isArray(payload.data)) setItems(payload.data);
    setSaved(response.ok);
    setSaving(false);
  }

  return <div className="dashboard-page services-page">
    <header className="page-header"><div><p className="eyebrow">BOOKABLE MENU</p><h1>Services</h1><p>Set the full price, exact duration and customer-facing image for every appointment.</p></div><div className="page-actions"><button className="button secondary" onClick={() => setItems([...items, { id: `service-${Date.now()}`, name: "New service", description: "Describe what is included.", durationMinutes: 45, priceCents: 4000, category: "Haircut", active: true, imageUrl: "" }])}><Plus/> Add service</button><button className="button" onClick={save} disabled={saving}><Save/> {saving ? "Saving…" : saved ? "Saved" : "Save changes"}</button></div></header>
    <section className="service-admin-intro"><span><Scissors/></span><div><b>The booking deposit is automatically subtracted from every active service.</b><p>Customers always see the appointment total, amount due now and remaining shop balance before checkout.</p></div><HelpTip text="The deposit amount is controlled in Storefront settings. Service price should be the complete appointment price before the deposit is deducted."/></section>
    <section className="service-admin-list">{items.map((service,index)=><article className="dashboard-card service-admin-card service-admin-with-media" key={service.id}>
      <span className="drag-handle"><GripVertical/></span><div className="service-number">{String(index+1).padStart(2,"0")}</div>
      <div className="service-image-editor">{barberId ? <MediaUploader barberId={barberId} label="Service image" help="Show a clear example of this service or finished style. The image appears on the customer page and during booking." folder="services" aspect="square" value={service.imageUrl || ""} onChange={(url) => update(service.id,"imageUrl",url)}/> : <div className="media-loading-placeholder">Loading image tools…</div>}</div>
      <div className="service-fields"><div className="form-grid three">
        <label><span>Service name <HelpTip text="Use the name customers already ask for, such as Low Taper or Cut + Beard."/></span><input value={service.name} onChange={(event)=>update(service.id,"name",event.target.value)}/></label>
        <label><span>Category</span><select value={service.category} onChange={(event)=>update(service.id,"category",event.target.value)}><option>Haircut</option><option>Combination</option><option>Maintenance</option><option>Kids</option><option>Protective styles</option></select></label>
        <label><span>Public status <HelpTip text="Hidden services remain in your records but cannot be selected by customers."/></span><select value={service.active?"active":"hidden"} onChange={(event)=>update(service.id,"active",event.target.value==="active")}><option value="active">Active</option><option value="hidden">Hidden</option></select></label>
        <label className="full"><span>Description</span><textarea value={service.description} onChange={(event)=>update(service.id,"description",event.target.value)}/></label>
        <label><span>Duration <HelpTip text="Duration controls availability. Include consultation, cleanup and the buffer needed before the next client."/></span><div className="suffix-input"><input value={service.durationMinutes} onChange={(event)=>update(service.id,"durationMinutes",event.target.value)}/><span>minutes</span></div></label>
        <label><span>Full price</span><div className="money-input"><span>$</span><input value={(service.priceCents/100).toFixed(0)} onChange={(event)=>update(service.id,"priceCents",event.target.value)}/></div></label>
        <div className="service-balance-preview"><Clock3/><span><small>CUSTOMER SEES</small><b>{money(service.priceCents)} total · deposit now · remaining balance later</b></span></div>
      </div></div><button className="icon-button danger" aria-label={`Delete ${service.name}`} onClick={()=>setItems((current)=>current.filter((item)=>item.id!==service.id))}><Trash2/></button>
    </article>)}</section>
  </div>;
}
