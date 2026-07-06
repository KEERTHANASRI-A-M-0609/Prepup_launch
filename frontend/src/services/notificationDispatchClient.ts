import { getMongoToken, mongoAPI } from './mongoAPI'

export type DispatchPayload = {
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  moduleId?: string
  channels?: { whatsapp?: boolean }
}

export async function dispatchPlatformNotification(payload: DispatchPayload): Promise<void> {
  if (!getMongoToken()) return
  try {
    await mongoAPI.dispatchNotification(payload)
  } catch {
    // Local in-app notification still shown; backend may be offline
  }
}
