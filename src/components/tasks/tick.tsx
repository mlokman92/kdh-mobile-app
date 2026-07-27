/**
 * A single shared 1-second clock for the whole Tasks screen.
 *
 * Every SLA countdown on screen has to tick, but one `setInterval` per card
 * would mean thirty-odd timers fighting for the JS thread. Instead the screen
 * mounts ONE interval and publishes the timestamp through context; only the
 * small <Text> nodes that actually print a countdown subscribe to it, so a tick
 * never re-renders a whole card.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

const TickContext = createContext<number>(Date.now())

export interface TickProviderProps {
  children: ReactNode
  /** Milliseconds between ticks. Default 1000. */
  intervalMs?: number
  /** Pause the clock (e.g. while the screen is off-view). */
  paused?: boolean
}

export function TickProvider({ children, intervalMs = 1000, paused = false }: TickProviderProps) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (paused) return
    // Re-sync immediately so a resumed screen never shows a stale countdown.
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, paused])

  return <TickContext.Provider value={now}>{children}</TickContext.Provider>
}

/** The shared "now" in epoch milliseconds. Updates once per second. */
export function useTick(): number {
  return useContext(TickContext)
}
