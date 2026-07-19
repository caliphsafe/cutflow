"use client";

import { HelpCircle } from "lucide-react";
import { useId, useState } from "react";

export function HelpTip({ text, label = "More information" }: { text: string; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="help-tip-wrap">
    <button
      type="button"
      className="help-tip-trigger"
      aria-label={label}
      aria-describedby={open ? id : undefined}
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
      onBlur={() => setOpen(false)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    ><HelpCircle size={15}/></button>
    {open && <span id={id} role="tooltip" className="help-tip-popover">{text}</span>}
  </span>;
}
