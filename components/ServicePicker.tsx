import { Check, Clock3 } from "lucide-react";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";

export function ServicePicker({ services, selectedId, onSelect }: { services: Service[]; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="service-choice-grid booking-service-list">
    {services.filter((item) => item.active).map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "service-choice selected" : "service-choice"} aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}>
      {item.imageUrl && <img className="booking-service-thumbnail" src={item.imageUrl} alt="" loading="lazy"/>}
      <div className="booking-service-copy"><b>{item.name}</b>{item.description && <p>{item.description}</p>}<span><Clock3 size={14}/>{item.durationMinutes} min</span></div>
      <div className="booking-service-price"><strong>{money(item.priceCents)}</strong><span className="choice-check">{selectedId === item.id && <Check size={14}/>}</span></div>
    </button>)}
  </div>;
}
