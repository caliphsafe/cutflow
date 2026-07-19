"use client";

import { ImagePlus, LoaderCircle, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { HelpTip } from "./HelpTip";

type Props = {
  barberId: string;
  value?: string;
  onChange: (url: string) => void;
  label: string;
  help: string;
  folder: string;
  aspect?: "portrait" | "landscape" | "square";
};

const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function MediaUploader({ barberId, value = "", onChange, label, help, folder, aspect = "landscape" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function choose(file?: File) {
    if (!file) return;
    setError("");
    if (!allowed.includes(file.type)) return setError("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > 8 * 1024 * 1024) return setError("The image must be smaller than 8 MB.");
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !barberId) return setError("Sign in again before uploading.");
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${barberId}/${folder}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("cutflow-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("cutflow-media").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div className={`media-uploader ${aspect}`}>
    <div className="media-uploader-label"><b>{label}</b><HelpTip text={help}/></div>
    <button type="button" className={value ? "media-preview has-image" : "media-preview"} onClick={() => input.current?.click()}>
      {value ? <img src={value} alt=""/> : <span><ImagePlus/><b>Add image</b><small>JPG, PNG, WebP or AVIF · 8 MB max</small></span>}
      {uploading && <i><LoaderCircle className="spin"/> Uploading…</i>}
    </button>
    <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => choose(event.target.files?.[0])}/>
    <div className="media-uploader-actions">
      <button type="button" onClick={() => input.current?.click()} disabled={uploading}>{value ? <RefreshCcw/> : <UploadCloud/>}{value ? "Replace" : "Upload"}</button>
      {value && <button type="button" className="danger" onClick={() => onChange("")} disabled={uploading}><Trash2/> Remove</button>}
    </div>
    {error && <small className="media-error">{error}</small>}
  </div>;
}
