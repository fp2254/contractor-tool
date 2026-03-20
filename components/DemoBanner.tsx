export function DemoBanner() {
  return (
    <div className="bg-amber-400 text-amber-900 px-4 py-2.5 text-center" style={{ zIndex: 50 }}>
      <p className="text-xs font-bold leading-tight">
        🔭 Demo Mode
      </p>
      <p className="text-[11px] leading-snug opacity-80">
        You&apos;re exploring TradeBase with sample data. Some actions are limited and changes may reset.
      </p>
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide">
      Demo
    </span>
  );
}
