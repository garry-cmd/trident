"use client";
import KpiCard from "./KpiCard";

// The persistent four-card status strip. Stays put when a card opens — it's the
// glance layer you never lose. One card open at a time (accordion) is owned by
// the page; this just renders + reports taps.
export default function KpiStrip({ cards, openArea, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {cards.map((c) => (
        <KpiCard
          key={c.area}
          name={c.name}
          status={c.status}
          value={c.value}
          sub={c.sub}
          active={openArea === c.area}
          onClick={() => onSelect(openArea === c.area ? null : c.area)}
        />
      ))}
    </div>
  );
}
