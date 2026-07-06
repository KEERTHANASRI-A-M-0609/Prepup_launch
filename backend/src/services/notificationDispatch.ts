import { User } from '../models/User'

import { Notification } from '../models/Notification'

import { logger } from '../utils/logger'

import { sendWhatsAppReliable, type WhatsAppSendResult } from './twilioWhatsApp'



export type NotificationType = 'info' | 'warning' | 'success' | 'danger'



export interface DispatchPayload {

  title: string

  message: string

  type: NotificationType

  moduleId?: string

  channels?: {

    whatsapp?: boolean

  }

}



export type DispatchResult = {

  inApp: boolean

  whatsapp?: WhatsAppSendResult

}



export const notificationDispatch = {

  async createAndDispatch(userId: string, data: DispatchPayload): Promise<DispatchResult> {

    const { channels, ...notificationData } = data

    const existing = await Notification.findOne({

      userId,

      title: notificationData.title,

      read: false,

      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },

    })

    if (!existing) {

      await Notification.create({ userId, ...notificationData, read: false })

    }



    const result: DispatchResult = { inApp: !existing }



    if (existing) return result



    const user = await User.findById(userId)

    if (!user) return result



    const prefs = user.notificationPrefs ?? {}

    const fullMessage = `${notificationData.title}\n\n${notificationData.message}`

    const whatsappAllowed = channels?.whatsapp !== false && prefs.whatsappEnabled !== false



    const phone = user.phone

    if (

      phone &&

      whatsappAllowed &&

      (notificationData.type === 'danger' || notificationData.type === 'warning' || notificationData.type === 'success' || notificationData.type === 'info')

    ) {

      const wa = await sendWhatsAppReliable(phone, fullMessage)

      result.whatsapp = wa

      if (wa.status === 'error') {

        logger.warn(`[Dispatch] WhatsApp failed for ${userId}:`, wa.reason)

      }

    }



    return result

  },

}

