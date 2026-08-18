import type { ReactNode } from 'react'

export function BrandHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.07] bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-[min(1220px,calc(100%-32px))] items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div
            className="relative h-[34px] w-[34px] rounded-[10px] bg-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
            aria-hidden="true"
          >
            <span className="absolute inset-[9px] rounded-full border-[3px] border-white border-t-transparent rotate-[-20deg]" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-ink">Appsrow</div>
            <div className="hidden text-[12px] font-semibold uppercase tracking-[0.03em] text-muted sm:block">
              Universal Discovery System
            </div>
          </div>
        </div>
        {right}
      </div>
    </header>
  )
}
