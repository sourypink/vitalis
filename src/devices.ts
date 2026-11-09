// Watches Vitalis could read from. Sensor and feature claims are sourced in research/RESEARCH.md §7.

export type FallDetection = 'always' | 'during workouts' | 'none'

export type Device = {
  id: string
  name: string
  models: string
  gyroscope: 'yes' | 'some models' | 'no'
  heartRate: boolean
  sleep: boolean
  fallDetection: FallDetection
  /** Gait and balance measures beyond step counts. */
  gait: string
  /** How a real (native) Vitalis app would receive the data. */
  dataPath: string
  note: string
  recommended: boolean
  source: string
}

export const DEVICES: Device[] = [
  {
    id: 'apple',
    name: 'Apple Watch',
    models: 'Series 4 or newer, SE',
    gyroscope: 'yes',
    heartRate: true,
    sleep: true,
    fallDetection: 'always',
    gait: 'Walking speed, step length and Walking Steadiness (with iPhone)',
    dataPath: 'Apple Health (HealthKit), iPhone app',
    note: 'Fall Detection turns on by itself for people 55+; it calls emergency services if you don’t respond.',
    recommended: true,
    source: '[12][29][30]',
  },
  {
    id: 'samsung',
    name: 'Samsung Galaxy Watch',
    models: 'Watch 4 or newer',
    gyroscope: 'yes',
    heartRate: true,
    sleep: true,
    fallDetection: 'always',
    gait: 'Steps and walking time',
    dataPath: 'Samsung Health → Health Connect, Android app',
    note: 'Fall detection must be switched on in the Galaxy Wearable app.',
    recommended: true,
    source: '[31]',
  },
  {
    id: 'pixel',
    name: 'Google Pixel Watch',
    models: 'All models',
    gyroscope: 'yes',
    heartRate: true,
    sleep: true,
    fallDetection: 'always',
    gait: 'Steps and walking time',
    dataPath: 'Fitbit app → Health Connect or Google Health API',
    note: 'Fall detection uses the watch’s motion sensors.',
    recommended: true,
    source: '[31]',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    models: 'Sense 2, Versa 4, Charge 6',
    gyroscope: 'no',
    heartRate: true,
    sleep: true,
    fallDetection: 'none',
    gait: 'Steps only (accelerometer)',
    dataPath: 'Google Health API (the old Fitbit Web API retires Sept 2026)',
    note: 'Good for steps and sleep, but no fall detection.',
    recommended: false,
    source: '[31][33]',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    models: 'Venu, vívoactive',
    gyroscope: 'some models',
    heartRate: true,
    sleep: true,
    fallDetection: 'during workouts',
    gait: 'Steps and walking time',
    dataPath: 'Garmin Health API (needs Garmin’s approval)',
    note: 'Incident detection only works while a workout is being recorded.',
    recommended: false,
    source: '[32][33]',
  },
  {
    id: 'withings',
    name: 'Withings ScanWatch',
    models: 'ScanWatch 2, Light',
    gyroscope: 'no',
    heartRate: true,
    sleep: true,
    fallDetection: 'none',
    gait: 'Steps only',
    dataPath: 'Withings app',
    note: 'No fall detection and no way to call for help.',
    recommended: false,
    source: '[32]',
  },
]

/** iPhone in a pocket: no watch needed for walking measures, but nothing on the wrist. */
export const PHONE_ONLY: Device = {
  id: 'phone',
  name: 'Phone only',
  models: 'iPhone, carried in a pocket',
  gyroscope: 'yes',
  heartRate: false,
  sleep: false,
  fallDetection: 'none',
  gait: 'Walking speed, step length and Walking Steadiness',
  dataPath: 'Apple Health (HealthKit), iPhone app',
  note: 'Tracks walking, but can’t detect a fall or measure heart rate and sleep.',
  recommended: false,
  source: '[29]',
}

export function findDevice(id: string | null): Device | null {
  if (id === null) return null
  return [...DEVICES, PHONE_ONLY].find((device) => device.id === id) ?? null
}

/** What each sensor is for, in plain words. */
export const SENSORS = [
  { name: 'Accelerometer', use: 'Counts steps and measures how fast and how evenly you walk.' },
  { name: 'Gyroscope', use: 'Senses turning and swaying, and helps tell a real fall from a dropped arm.' },
  { name: 'Heart rate', use: 'Shows effort during exercise, and changes that can come with dizziness.' },
  { name: 'Fall detection', use: 'Notices a hard fall and calls for help if you don’t respond.' },
]
