"use client"

import { useCallback, useEffect, useState } from "react"

// Chrome/Edge/Android fire this when the app can be installed; Safari never does.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Browser-only facts, read after mount so server and client render the same.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPadOS
    )

    const onPrompt = (event: Event) => {
      event.preventDefault() // keep it for our own menu item instead of the mini-infobar
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setIsStandalone(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null) // the browser only allows one prompt per event
  }, [deferred])

  return {
    /** Show an "Install app" entry: not already installed, and we can either prompt or explain. */
    available: !isStandalone && (deferred !== null || isIos),
    canPrompt: deferred !== null,
    install,
  }
}
