import { useCallback, useEffect, useRef, useState } from 'react'
import { FALL_COUNTDOWN_SECONDS, FALL_RESPONSE_SECONDS } from './engine/constants'

const FALL_TIMER_MS = 250

// Fall escalation, after Apple Fall Detection [12]: ~1 min for the wearer to respond, then a 30 s countdown.
export const FALL_STEPS = [
  { at: 0, id: 'ask', text: 'Watch asks “Are you OK?”' },
  { at: FALL_RESPONSE_SECONDS, id: 'family', text: 'No response: your family contact is alerted' },
  { at: FALL_RESPONSE_SECONDS + FALL_COUNTDOWN_SECONDS, id: 'emergency', text: 'Emergency call (mock, nothing is dialled)' },
] as const
export type FallStep = (typeof FALL_STEPS)[number]
const FALL_END = FALL_STEPS[FALL_STEPS.length - 1].at

export type FallStatus = 'idle' | 'running' | 'cancelled' | 'complete'
export type FallEscalation = {
  status: FallStatus
  elapsed: number
  start: () => void
  stop: () => void
  /** "I'm OK" on the watch. */
  cancel: () => void
  /** Jump to the next step. */
  skip: () => void
}

export function useFallEscalation(onStep: (step: FallStep) => void): FallEscalation {
  const [status, setStatus] = useState<FallStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)
  const offset = useRef(0)
  const fired = useRef(new Set<string>())
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  useEffect(() => {
    if (status !== 'running') return
    const update = () => {
      const seconds = Math.min(FALL_END, (Date.now() - startedAt.current) / 1000 + offset.current)
      setElapsed(seconds)
      for (const step of FALL_STEPS) {
        if (seconds >= step.at && !fired.current.has(step.id)) {
          fired.current.add(step.id)
          onStepRef.current(step)
        }
      }
      if (seconds >= FALL_END) setStatus('complete')
    }
    update()
    const timer = window.setInterval(update, FALL_TIMER_MS)
    return () => window.clearInterval(timer)
  }, [status])

  const start = useCallback(() => {
    startedAt.current = Date.now()
    offset.current = 0
    fired.current = new Set()
    setElapsed(0)
    setStatus('running')
  }, [])
  const stop = useCallback(() => {
    setStatus('idle')
    setElapsed(0)
  }, [])
  const cancel = useCallback(() => setStatus((current) => (current === 'running' ? 'cancelled' : current)), [])
  const skip = useCallback(() => {
    const seconds = (Date.now() - startedAt.current) / 1000 + offset.current
    const next = FALL_STEPS.find((step) => step.at > seconds)
    if (next) offset.current += next.at - seconds
  }, [])

  return { status, elapsed, start, stop, cancel, skip }
}
