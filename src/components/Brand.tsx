export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-brand-50 shadow-sm ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/plant.png" alt="Parsely" className="h-[75%] w-[75%] object-contain" />
    </span>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className="h-8 w-8" />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-slate-900">
          Parsely
        </div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
    </div>
  );
}
