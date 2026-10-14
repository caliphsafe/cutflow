"use client";

import { CalendarOff, Clock3, Mail, MessageSquareText, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const emptyBlock={startsAt:"",endsAt:"",reason:"",blockType:"personal"};

const emailOptions = [
  ["customer_confirmation_email", "Send customers a booking confirmation", "Includes the appointment time, service, deposit and private appointment link."],
  ["reminder_24h_email", "Send a reminder one day before", "Helps customers remember the appointment and review their details."],
  ["barber_new_booking_email", "Email me when a booking is confirmed", "Receive the customer name, service, date and appointment time."],
] as const;

const smsOptions = [
  ["customer_confirmation_sms", "Text customers after booking", "A short confirmation sent only when the customer agrees to texts."],
  ["reminder_24h_sms", "Send a text reminder one day before", "A brief reminder with the appointment date and time."],
  ["reminder_2h_sms", "Send a text reminder two hours before", "A final same-day reminder before the appointment."],
  ["barber_new_booking_sms", "Text me when a booking is confirmed", "A quick new-booking alert sent to your business phone."],
] as const;

export function BookingPoliciesForm(){
  const[data,setData]=useState<any>(null);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[block,setBlock]=useState(emptyBlock);
  const smsAvailable = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";

  async function load(){const r=await fetch("/api/dashboard/policies");const p=await r.json();if(r.ok)setData(p)}
  useEffect(()=>{load()},[]);
  async function save(){setSaving(true);const r=await fetch("/api/dashboard/policies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({policy:data.policy,notifications:data.notifications})});setMessage(r.ok?"Your booking settings were saved.":"Your settings could not be saved. Please try again.");setSaving(false)}
  async function blockAction(action:string,item:any={}){setSaving(true);const r=await fetch("/api/dashboard/policies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,item,id:item.id})});const p=await r.json();if(r.ok){setData(p);setBlock(emptyBlock)}else setMessage(p.error||"Blocked time could not be updated.");setSaving(false)}
  if(!data)return <div className="dashboard-card loading-card">Loading booking controls…</div>;
  const policy=data.policy||{};
  const notifications=data.notifications||{};
  const setPolicy=(key:string,value:any)=>setData({...data,policy:{...policy,[key]:value}});
  const setNotification=(key:string,value:boolean)=>setData({...data,notifications:{...notifications,[key]:value}});

  return <>
    <div className="policy-layout">
      <section className="dashboard-card policy-card"><header><span><Clock3/></span><div><h2>Booking windows</h2><p>Control how early customers can book, cancel and reschedule.</p></div></header><div className="form-grid two"><label><span>Minimum notice</span><select value={policy.minimum_notice_minutes} onChange={e=>setPolicy("minimum_notice_minutes",Number(e.target.value))}><option value="0">No minimum</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option><option value="1440">24 hours</option></select></label><label><span>Book up to</span><select value={policy.max_advance_days} onChange={e=>setPolicy("max_advance_days",Number(e.target.value))}><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">180 days</option></select></label><label><span>Cancellation cutoff</span><input type="number" min="0" value={policy.cancellation_window_hours} onChange={e=>setPolicy("cancellation_window_hours",Number(e.target.value))}/><small>Hours before appointment</small></label><label><span>Reschedule cutoff</span><input type="number" min="0" value={policy.reschedule_window_hours} onChange={e=>setPolicy("reschedule_window_hours",Number(e.target.value))}/><small>Hours before appointment</small></label><label><span>Maximum reschedules</span><input type="number" min="0" max="10" value={policy.max_reschedules} onChange={e=>setPolicy("max_reschedules",Number(e.target.value))}/></label></div><div className="settings-toggle-list"><label><input type="checkbox" checked={policy.same_day_booking} onChange={e=>setPolicy("same_day_booking",e.target.checked)}/><span><b>Allow same-day booking</b><small>Your minimum-notice rule still applies.</small></span></label><label><input type="checkbox" checked={policy.customer_reschedule_enabled} onChange={e=>setPolicy("customer_reschedule_enabled",e.target.checked)}/><span><b>Let customers reschedule online</b><small>Customers use their private appointment link.</small></span></label><label><input type="checkbox" checked={policy.customer_cancellation_enabled} onChange={e=>setPolicy("customer_cancellation_enabled",e.target.checked)}/><span><b>Let customers cancel online</b><small>Customers use their private appointment link.</small></span></label><label><input type="checkbox" checked={policy.retain_late_cancellation_deposit} onChange={e=>setPolicy("retain_late_cancellation_deposit",e.target.checked)}/><span><b>Keep deposits for late cancellations</b><small>Applies when a cancellation is inside your cutoff.</small></span></label><label><input type="checkbox" checked={policy.retain_no_show_deposit} onChange={e=>setPolicy("retain_no_show_deposit",e.target.checked)}/><span><b>Keep deposits for no-shows</b><small>Applies when you mark an appointment as a no-show.</small></span></label></div><label><span>Policy shown to customers</span><textarea value={policy.policy_text||""} onChange={e=>setPolicy("policy_text",e.target.value)} rows={4} placeholder="Explain cancellations, rescheduling, lateness and deposits in your own words."/></label></section>

      <section className="dashboard-card policy-card"><header><span><CalendarOff/></span><div><h2>Time off and blocked time</h2><p>Add vacations, lunch breaks or private appointments.</p></div></header><div className="form-grid two"><label><span>Starts</span><input type="datetime-local" value={block.startsAt} onChange={e=>setBlock({...block,startsAt:e.target.value})}/></label><label><span>Ends</span><input type="datetime-local" value={block.endsAt} onChange={e=>setBlock({...block,endsAt:e.target.value})}/></label><label><span>Type</span><select value={block.blockType} onChange={e=>setBlock({...block,blockType:e.target.value})}><option value="personal">Personal</option><option value="vacation">Vacation</option><option value="lunch">Lunch</option><option value="other">Other</option></select></label><label><span>Reason</span><input value={block.reason} onChange={e=>setBlock({...block,reason:e.target.value})} placeholder="Unavailable"/></label></div><button className="button secondary" disabled={!block.startsAt||!block.endsAt||saving} onClick={()=>blockAction("add_block",block)}><Plus/> Add blocked time</button><div className="blocked-list">{data.blocks.length?data.blocks.map((item:any)=><div key={item.id}><div><b>{item.reason}</b><span>{new Date(item.starts_at).toLocaleString()} → {new Date(item.ends_at).toLocaleString()}</span></div><button className="icon-button" onClick={()=>blockAction("delete_block",item)} aria-label="Delete blocked time"><Trash2/></button></div>):<p>No upcoming blocked time.</p>}</div></section>
    </div>

    <section id="notifications" className="dashboard-card policy-card notification-policy"><header><span><Mail/></span><div><h2>Customer messages</h2><p>Choose the confirmations and reminders CutFlow sends for your business. You do not need to connect another account.</p></div></header>
      <div className="communication-groups">
        <div className="communication-group"><header><Mail/><div><b>Email messages</b><small>Included with CutFlow</small></div></header><div className="settings-toggle-list">{emailOptions.map(([key,label,copy])=><label key={key}><input type="checkbox" checked={Boolean(notifications[key])} onChange={e=>setNotification(key,e.target.checked)}/><span><b>{label}</b><small>{copy}</small></span></label>)}</div></div>
        <div className={`communication-group ${smsAvailable ? "" : "unavailable"}`}><header><MessageSquareText/><div><b>Text messages</b><small>{smsAvailable ? "Optional" : "Coming soon for your account"}</small></div></header><div className="settings-toggle-list">{smsOptions.map(([key,label,copy])=><label key={key}><input type="checkbox" disabled={!smsAvailable} checked={smsAvailable && Boolean(notifications[key])} onChange={e=>setNotification(key,e.target.checked)}/><span><b>{label}</b><small>{smsAvailable ? copy : "This option will appear automatically when text messaging is available."}</small></span></label>)}</div></div>
      </div>
    </section>
    <div className="sticky-save-bar"><span>{message}</span><button className="button" disabled={saving} onClick={save}><Save/>{saving?"Saving…":"Save booking settings"}</button></div>
  </>;
}
