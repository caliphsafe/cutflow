"use client";

import { useMemo, useState } from "react";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function PricingComparison() {
  const [monthlySales, setMonthlySales] = useState(6000);
  const [commissionRate, setCommissionRate] = useState(10);
  const commissionCost = useMemo(() => monthlySales * commissionRate / 100, [commissionRate, monthlySales]);
  const monthlyDifference = commissionCost - 69;
  const annualDifference = monthlyDifference * 12;

  return <div className="pricing-calculator glass-card">
    <div className="calculator-controls">
      <label><span>Monthly appointment sales</span><div className="large-money-input calculator-money"><span>$</span><input type="number" min="0" step="250" value={monthlySales} onChange={(event) => setMonthlySales(Math.max(0, Number(event.target.value || 0)))}/></div></label>
      <div><span className="calculator-label">Example booking commission</span><div className="rate-buttons">{[5,10,20,30].map((rate)=><button type="button" className={rate===commissionRate?"active":""} key={rate} onClick={()=>setCommissionRate(rate)}>{rate}%</button>)}</div></div>
    </div>
    <div className="calculator-results">
      <article><small>PERCENTAGE MODEL</small><strong>{money(commissionCost)}</strong><p>per month at {commissionRate}%</p></article>
      <article className="cutflow-result"><small>CUTFLOW COMPLETE</small><strong>$69</strong><p>per month, regardless of appointment sales</p></article>
      <article><small>DIFFERENCE</small><strong>{monthlyDifference >= 0 ? money(monthlyDifference) : `-${money(Math.abs(monthlyDifference))}`}</strong><p>{monthlyDifference >= 0 ? `${money(Math.max(0, annualDifference))} more over a year` : "The percentage example is lower at this sales level"}</p></article>
    </div>
    <p className="calculator-disclaimer">This is an illustrative booking-commission comparison, not a quote for another company. Normal card-processing fees are separate and still apply.</p>
  </div>;
}
