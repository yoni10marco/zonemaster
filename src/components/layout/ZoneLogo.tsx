import { cn } from "@/lib/utils"

// The same five-zone heart-rate dial as the app icon (src/app/icon.svg), drawn
// without its tile so it sits directly on the page. The needle and hub follow
// the text color (so it works in light and dark mode) and the hub's center
// punches through to whatever background is behind it.
const CENTER = 256
const RADIUS = 150
const STROKE = 60
const ZONE_COLORS = ["#0ea5e9", "#10b981", "#eab308", "#f97316", "#ef4444"] as const // Z1 easy -> Z5 max
const START_DEG = 135
const SWEEP_DEG = 270
const GAP_DEG = 5

function point(deg: number, radius: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

const zoneStep = SWEEP_DEG / ZONE_COLORS.length

const ZONE_PATHS = ZONE_COLORS.map((color, i) => {
  const [x0, y0] = point(START_DEG + zoneStep * i + GAP_DEG / 2, RADIUS)
  const [x1, y1] = point(START_DEG + zoneStep * (i + 1) - GAP_DEG / 2, RADIUS)
  return { color, d: `M${x0.toFixed(2)} ${y0.toFixed(2)} A${RADIUS} ${RADIUS} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}` }
})

const [NEEDLE_X, NEEDLE_Y] = point(START_DEG + zoneStep * 3.55, 112) // into Z4

export function ZoneLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="56 30 400 400"
      aria-hidden="true"
      focusable="false"
      className={cn("text-primary", className)}
    >
      {ZONE_PATHS.map(({ color, d }) => (
        <path key={color} d={d} fill="none" stroke={color} strokeWidth={STROKE} />
      ))}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={NEEDLE_X}
        y2={NEEDLE_Y}
        stroke="currentColor"
        strokeWidth={30}
        strokeLinecap="round"
      />
      <circle cx={CENTER} cy={CENTER} r={42} fill="currentColor" />
      <circle cx={CENTER} cy={CENTER} r={17} style={{ fill: "var(--background)" }} />
    </svg>
  )
}
