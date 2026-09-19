import type { MetadataRoute } from "next"

// Makes Zone Master installable ("Add to Home Screen"): it then opens in its own
// window without browser chrome, starting on the calendar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zone Master",
    short_name: "Zone Master",
    description: "Plan, track, and analyze your endurance training.",
    start_url: "/calendar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
