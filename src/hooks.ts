import { useCallback, useEffect, useRef, useState } from 'react'
import { FALL_COUNTDOWN_SECONDS, FALL_RESPONSE_SECONDS } from './engine/constants'

const TICK_MS = 1000 // the wearable simulator ticks once a second
const FALL_TIMER_MS = 250

/** Counts up once a second while mounted. */
export function useTicker(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((count) => count + 1), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])
  return tick
}

// Fall escalation, after Apple Fall Detection [12]: ~1 min for the wearer to respond, then a 30 s countdown.
export const FALL_STEPS = [
  { at: 0, id: 'ask', text: 'Watch asks “Are you OK?”' },
  { at: FALL_RESPONSE_SECONDS, id: 'family', text: 'No response: Sarah is alerted' },
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

// Web Bluetooth heart-rate strap: standard Heart Rate Service 0x180D, measurement characteristic 0x2A37.
// Chrome on Android and desktop only; the button is hidden where navigator.bluetooth is missing (iOS).
type BluetoothCharacteristic = EventTarget & { value?: DataView; startNotifications: () => Promise<unknown> }
type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { filters: { services: number[] }[] }) => Promise<{
      name?: string
      gatt?: { connect: () => Promise<{ getPrimaryService: (id: number) => Promise<{ getCharacteristic: (id: number) => Promise<BluetoothCharacteristic> }> }> }
    }>
  }
}
const HEART_RATE_SERVICE = 0x180d
const HEART_RATE_MEASUREMENT = 0x2a37
const HR_FORMAT_UINT16 = 0x01 // flags bit 0: heart rate value is 16-bit

/** Parses a Heart Rate Measurement (0x2A37) value into bpm. */
export function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0)
  return flags & HR_FORMAT_UINT16 ? value.getUint16(1, true) : value.getUint8(1)
}

export type HeartRateStrap = {
  supported: boolean
  bpm: number | null
  deviceName: string | null
  error: string | null
  connect: () => Promise<void>
}

export function useHeartRateStrap(): HeartRateStrap {
  const bluetooth = (navigator as BluetoothNavigator).bluetooth
  const [bpm, setBpm] = useState<number | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (!bluetooth) return
    setError(null)
    try {
      const device = await bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] })
      if (!device.gatt) throw new Error('This device has no GATT server')
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
      characteristic.addEventListener('characteristicvaluechanged', () => {
        if (characteristic.value) setBpm(parseHeartRate(characteristic.value))
      })
      await characteristic.startNotifications()
      setDeviceName(device.name ?? 'Heart rate strap')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
    }
  }, [bluetooth])

  return { supported: Boolean(bluetooth), bpm, deviceName, error, connect }
}
