import { Bike, Dumbbell, Footprints, Waves } from "lucide-react"

// Purely decorative — faint triathlon (swim/bike/run) + strength glyphs
// scattered behind the page content. Fixed + pointer-events-none so they
// never intercept clicks or scroll with the page.
export function BackgroundIcons() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-primary"
    >
      <Waves className="absolute -top-8 -left-10 size-40 -rotate-12 opacity-[0.06]" />
      <Bike className="absolute top-1/4 -right-14 size-52 rotate-6 opacity-[0.06]" />
      <Footprints className="absolute bottom-24 left-1/4 size-32 rotate-12 opacity-[0.05]" />
      <Dumbbell className="absolute -bottom-10 -right-8 size-44 -rotate-6 opacity-[0.06]" />
      <Waves className="absolute top-2/3 left-8 size-24 rotate-3 opacity-[0.04]" />
    </div>
  )
}
