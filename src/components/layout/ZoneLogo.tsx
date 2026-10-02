import { cn } from "@/lib/utils"
import { INTENSITY_ZONES, ZONE_COLORS } from "@/lib/types/domain"

// The same five-zone heart-rate dial as the app icon (src/app/icon.svg), drawn
// without its tile so it sits directly on the page. The needle and hub follow
// the text color (so it works in light and dark mode) and the hub's center
// punches through to whatever background is behind it.
const CENTER = 256
const RADIUS = 150
const STROKE = 60
const ZONE_COLOR_LIST = INTENSITY_ZONES.map((z) => ZONE_COLORS[z]) // Z1 easy -> Z5 max
const START_DEG = 135
const SWEEP_DEG = 270
const GAP_DEG = 5

function point(deg: number, radius: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

const zoneStep = SWEEP_DEG / ZONE_COLOR_LIST.length

const ZONE_PATHS = ZONE_COLOR_LIST.map((color, i) => {
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
        x2={NEEDLE_X.toFixed(2)}
        y2={NEEDLE_Y.toFixed(2)}
        stroke="currentColor"
        strokeWidth={30}
        strokeLinecap="round"
      />
      <circle cx={CENTER} cy={CENTER} r={42} fill="currentColor" />
      <circle cx={CENTER} cy={CENTER} r={17} style={{ fill: "var(--background)" }} />
    </svg>
  )
}
