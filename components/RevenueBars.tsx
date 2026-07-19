import { weeklyRevenue } from "@/lib/demo-data";
import { money } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function RevenueBars({ transactions }: { transactions?: Transaction[] }) {
  const today = new Date();
  const series = transactions ? Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - offset));
    const value = transactions
      .filter((transaction) => {
        const itemDate = new Date(transaction.date);
        return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth() && itemDate.getDate() === date.getDate() && transaction.status === "paid";
      })
      .reduce((sum, transaction) => sum + transaction.netCents, 0);
    return { label: new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(date), value };
  }) : weeklyRevenue.map((item) => ({ label: item.label, value: item.value * 100 }));
  const max = Math.max(1, ...series.map((item) => item.value));
  const total = series.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="revenue-chart">
      <div className="chart-summary">
        <div><span>This week</span><strong>{money(total)}</strong></div>
        <span className="positive-pill">Live ledger</span>
      </div>
      <div className="bars" aria-label="Weekly revenue chart">
        {series.map((item, index) => (
          <div className="bar-column" key={`${item.label}-${index}`}>
            <div className="bar-track"><i style={{ height: `${Math.max(3, (item.value / max) * 100)}%` }} /></div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
