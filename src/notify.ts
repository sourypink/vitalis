// Browser notifications. Everything runs on this device; no push server.

export type PermissionState = NotificationPermission | 'unsupported'

export function notificationSupport(): PermissionState {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

let registration: Promise<ServiceWorkerRegistration | undefined> | undefined

/** Registers the service worker once. Android Chrome needs it to show notifications. */
function serviceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(undefined)
  registration ??= navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then(() => navigator.serviceWorker.ready)
  return registration
}

export async function requestNotifications(): Promise<PermissionState> {
  if (!('Notification' in window)) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'granted') await serviceWorker()
  return permission
}

/** Shows a real browser notification when allowed. Returns false when it could not. */
export async function showBrowserNotification(title: string, body: string): Promise<boolean> {
  if (notificationSupport() !== 'granted') return false
  const icon = `${import.meta.env.BASE_URL}favicon.svg`
  const worker = await serviceWorker()
  if (worker) {
    await worker.showNotification(title, { body, icon, tag: title })
    return true
  }
  new Notification(title, { body, icon })
  return true
}
