"use client";

import { Package, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HelpTip } from "@/components/HelpTip";
import { MediaUploader } from "@/components/MediaUploader";
import { products as seedProducts, services as seedServices } from "@/lib/demo-data";
import { money } from "@/lib/format";
import type { Product, Service } from "@/lib/types";

export default function ProductsPage(){
  const[items,setItems]=useState<Product[]>(seedProducts);
  const[services,setServices]=useState<Service[]>(seedServices);
  const[barberId,setBarberId]=useState("");
  const[query,setQuery]=useState("");
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(false);
  useEffect(()=>{Promise.all([
    fetch("/api/dashboard/data?resource=products").then(r=>r.json()),
    fetch("/api/dashboard/data?resource=services").then(r=>r.json()),
    fetch("/api/dashboard/data?resource=profile").then(r=>r.json()),
  ]).then(([productsPayload,servicesPayload,profilePayload])=>{if(Array.isArray(productsPayload.data))setItems(productsPayload.data);if(Array.isArray(servicesPayload.data))setServices(servicesPayload.data);if(profilePayload.data?.id)setBarberId(profilePayload.data.id)}).catch(()=>undefined)},[]);
  const filtered=useMemo(()=>items.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())),[items,query]);
  function update(id:string,field:keyof Product,value:string|number|boolean|string[]){setSaved(false);setItems(current=>current.map(item=>item.id===id?{...item,[field]:value}:item))}
  async function save(){setSaving(true);const response=await fetch("/api/dashboard/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"products",items})});const payload=await response.json();if(response.ok&&Array.isArray(payload.data))setItems(payload.data);setSaved(response.ok);setSaving(false)}
  return <div className="dashboard-page products-page"><header className="page-header"><div><p className="eyebrow">SMART SHOP PICKUP</p><h1>Products</h1><p>Sell retail for in-shop pickup and match it to services and saved hair textures.</p></div><button className="button" onClick={()=>setItems([...items,{id:`product-${Date.now()}`,name:"New product",description:"Product description",priceCents:1500,inventory:0,textureTags:["all"],serviceTags:[],pickupOnly:true,active:true,imageUrl:""}])}><Plus/> Add product</button></header>
  <section className="product-intelligence-banner"><Sparkles/><div><b>Recommendations are rule-based and transparent.</b><p>A product appears when its haircut-service tags and hair-texture tags match the customer’s current booking request.</p></div><span>SMART MATCH ON</span><HelpTip text="Customers only see products that are public, in stock and matched to the selected service and texture tags."/></section>
  <div className="table-toolbar dashboard-card"><label className="search-field"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search products"/></label><button className="button secondary" onClick={save} disabled={saving}><Save/> {saving?"Saving…":saved?"Saved":"Save catalog"}</button></div>
  <section className="product-admin-grid">{filtered.map((product)=><article className="dashboard-card product-admin-card" key={product.id}>
    <div className="product-media-admin">{barberId ? <MediaUploader barberId={barberId} label="Product photo" help="Use a clean image of the exact product customers will pick up at the shop." folder="products" aspect="square" value={product.imageUrl || ""} onChange={(url)=>update(product.id,"imageUrl",url)}/> : <div className="media-loading-placeholder"><Package/> Loading image tools…</div>}</div>
    <div className="product-admin-copy"><div className="product-admin-title"><div><small>{product.inventory} IN STOCK</small><input className="admin-inline-title" value={product.name} onChange={(event)=>update(product.id,"name",event.target.value)}/></div><strong>{money(product.priceCents)}</strong></div><textarea value={product.description} onChange={(event)=>update(product.id,"description",event.target.value)}/><div className="form-grid two">
      <label><span>Price</span><div className="money-input"><span>$</span><input value={(product.priceCents/100).toFixed(2)} onChange={(event)=>update(product.id,"priceCents",Math.round(Number(event.target.value)*100))}/></div></label>
      <label><span>Inventory <HelpTip text="Inventory is reserved when a customer pays the booking deposit and selects this item for pickup."/></span><input type="number" min="0" value={product.inventory} onChange={(event)=>update(product.id,"inventory",Number(event.target.value))}/></label>
      <label className="full"><span>Texture tags <HelpTip text="Separate tags with commas. Use all when a product is suitable for every hair texture."/></span><input value={product.textureTags.join(", ")} onChange={(event)=>update(product.id,"textureTags",event.target.value.split(",").map(tag=>tag.trim()).filter(Boolean))}/></label>
      <label className="full"><span>Matched services <HelpTip text="Hold Ctrl or Command to select more than one service. The product can be recommended when one of these services is booked."/></span><select multiple value={product.serviceTags} onChange={(event)=>update(product.id,"serviceTags",Array.from(event.target.selectedOptions).map(option=>option.value))}>{services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    </div><footer><span className={product.inventory<7?"stock-pill low":"stock-pill"}>{product.inventory<7?"Low stock":"Available"}</span><label><input type="checkbox" checked={product.active} onChange={(event)=>update(product.id,"active",event.target.checked)}/> Public</label><button className="icon-button danger" aria-label={`Delete ${product.name}`} onClick={()=>setItems(current=>current.filter(item=>item.id!==product.id))}><Trash2/></button></footer></div>
  </article>)}</section></div>}
