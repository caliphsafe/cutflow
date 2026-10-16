"use client";

import Link from "next/link";
import { Images, LoaderCircle, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaUploader } from "@/components/MediaUploader";
import { HelpTip } from "@/components/HelpTip";

type MediaProfile = {
  id: string;
  displayName: string;
  shopName: string;
  profileImageUrl: string;
  coverImageUrl: string;
  shopImageUrl: string;
  logoImageUrl: string;
  galleryImageUrls: string[];
};

const empty: MediaProfile = { id: "", displayName: "", shopName: "", profileImageUrl: "", coverImageUrl: "", shopImageUrl: "", logoImageUrl: "", galleryImageUrls: [] };

export default function MediaPage() {
  const [profile, setProfile] = useState<MediaProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/data?resource=profile").then((response) => response.json()).then((payload) => {
      if (payload.data) setProfile((current) => ({ ...current, ...payload.data, galleryImageUrls: payload.data.galleryImageUrls || [] }));
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setNotice("");
    const response = await fetch("/api/dashboard/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "profile", item: profile }) });
    const payload = await response.json();
    if (response.ok && payload.data) {
      setProfile((current) => ({ ...current, ...payload.data, galleryImageUrls: payload.data.galleryImageUrls || [] }));
      setNotice("Photos saved.");
    } else setNotice(payload.error || "Photos could not be saved.");
    setSaving(false);
  }

  function updateGallery(index: number, url: string) {
    setProfile((current) => ({ ...current, galleryImageUrls: current.galleryImageUrls.map((item, itemIndex) => itemIndex === index ? url : item).filter(Boolean) }));
  }

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading photos…</h2></section></div>;

  return <div className="dashboard-page media-page">
    <header className="page-header">
      <div><p className="eyebrow">CUSTOMER-FACING PHOTOGRAPHY</p><h1>Photos & media</h1><p>Add a barber portrait or brand logo to publish. Every other image is optional.</p></div>
      <div className="page-actions"><button className="button" onClick={save} disabled={saving || !profile.id}><Save/>{saving ? "Saving…" : "Save all photos"}</button></div>
    </header>

    {notice && <div className={notice.includes("saved") ? "inline-notice success" : "inline-notice error"}>{notice}</div>}

    <section className="dashboard-card media-guide-card">
      <span><Sparkles/></span><div><p className="eyebrow">IMAGE GUIDE</p><h2>Choose one identity image; the rest are optional.</h2><p>A barber portrait or brand logo meets the storefront image requirement. Add covers, shop photos, gallery, service and product images whenever you like.</p></div>
      <ul><li>Use bright, sharp photos without text overlays.</li><li>Keep the portrait or logo easy to recognize.</li><li>Cover, shop, gallery, service and product images are optional.</li></ul>
    </section>

    <section className="dashboard-card media-section">
      <header><div><span><Images/></span><div><h2>Storefront identity</h2><p>Required to publish: add a barber portrait or brand logo. Either one is enough; uploading both is optional.</p></div></div><HelpTip text="A barber portrait or brand logo is the only required image. You can add or replace either one later."/></header>
      <div className="media-grid">
        <MediaUploader barberId={profile.id} label="Barber portrait" help="A vertical or square barber photo. Required only if you do not upload a brand logo." folder="profile" aspect="portrait" value={profile.profileImageUrl} onChange={(profileImageUrl) => setProfile({ ...profile, profileImageUrl })}/>
        <MediaUploader barberId={profile.id} label="Brand logo" help="A square logo or mark. Required only if you do not upload a barber portrait." folder="logo" aspect="square" value={profile.logoImageUrl} onChange={(logoImageUrl) => setProfile({ ...profile, logoImageUrl })}/>
      </div>
    </section>

    <section className="dashboard-card media-section">
      <header><div><span><Images/></span><div><h2>Optional storefront photos</h2><p>Add a cover and shop interior to show the space. Neither is required to publish.</p></div></div><HelpTip text="Storefront cover and shop interior photos are optional and can be added whenever you have them."/></header>
      <div className="media-grid">
        <MediaUploader barberId={profile.id} label="Storefront cover" help="A wide image displayed behind the main customer-facing headline. Optional." folder="cover" aspect="landscape" value={profile.coverImageUrl} onChange={(coverImageUrl) => setProfile({ ...profile, coverImageUrl })}/>
        <MediaUploader barberId={profile.id} label="Shop interior" help="A photo that helps customers recognize the location and atmosphere. Optional." folder="shop" aspect="landscape" value={profile.shopImageUrl} onChange={(shopImageUrl) => setProfile({ ...profile, shopImageUrl })}/>
      </div>
    </section>

    <section className="dashboard-card media-section">
      <header><div><span><Images/></span><div><h2>Optional work gallery</h2><p>Add up to eight examples of cuts, styling, detail work or the shop environment. Gallery images are optional.</p></div></div><button className="button secondary" disabled={profile.galleryImageUrls.length >= 8} onClick={() => setProfile((current) => ({ ...current, galleryImageUrls: [...current.galleryImageUrls, ""] }))}><Plus/> Add gallery image</button></header>
      <div className="gallery-admin-grid">
        {profile.galleryImageUrls.map((url, index) => <div className="gallery-admin-item" key={`${index}-${url}`}>
          <MediaUploader barberId={profile.id} label={`Gallery image ${index + 1}`} help="Use finished cuts and details that represent the quality customers can expect." folder="gallery" aspect="square" value={url} onChange={(next) => updateGallery(index, next)}/>
          <button className="gallery-remove" onClick={() => setProfile((current) => ({ ...current, galleryImageUrls: current.galleryImageUrls.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2/> Remove slot</button>
        </div>)}
        {!profile.galleryImageUrls.length && <button className="gallery-empty-add" onClick={() => setProfile((current) => ({ ...current, galleryImageUrls: [""] }))}><Plus/><b>Add the first gallery image</b><span>Show customers your work, details and environment.</span></button>}
      </div>
    </section>

    <section className="dashboard-card media-next-card"><div><b>Optional service and product photos</b><p>Add service examples or product package photos where you manage those items. These images are optional and appear in booking and recommendation cards.</p></div><div className="media-next-actions"><Link className="button secondary" href="/dashboard/services">Manage service photos</Link><Link className="button secondary" href="/dashboard/products">Manage product photos</Link></div></section>
  </div>;
}
