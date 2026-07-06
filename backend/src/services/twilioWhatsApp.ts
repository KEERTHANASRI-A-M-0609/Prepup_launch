import { logger } from '../utils/logger'

export type WhatsAppSendResult = {
  status: 'sent' | 'error' | 'skipped'
  reason?: string
  hint?: string
  to?: string
  sid?: string
  twilio_status?: string
}

export function normalizeWhatsAppPhone(phone: string): string {
  let p = phone.trim().replace(/\s/g, '').replace(/-/g, '')
  if (p.startsWith('whatsapp:')) p = p.slice('whatsapp:'.length)
  if (!p.startsWith('+')) {
    const digits = p.replace(/\D/g, '')
    if (digits.length === 10) p = `+91${digits}`
    else if (digits.startsWith('91') && digits.length === 12) p = `+${digits}`
    else p = digits ? `+${digits}` : p
  }
  return p
}

export function isTwilioConfigured(): boolean {
  return Boolean(process.env.TWILIO_SID && process.env.TWILIO_TOKEN)
}

export async function sendWhatsApp(phone: string, message: string): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_SID
  const token = process.env.TWILIO_TOKEN
  let from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (!sid || !token) {
    return {
      status: 'skipped',
      reason: 'Twilio not configured — set TWILIO_SID and TWILIO_TOKEN in backend/.env',
    }
  }

  if (!from.startsWith('whatsapp:')) from = `whatsapp:${from}`

  const to = normalizeWhatsAppPhone(phone)
  if (to.length < 10) {
    return { status: 'error', reason: `Invalid phone number: ${phone}` }
  }

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${to}`,
    Body: message.slice(0, 1600),
  })

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json().catch(() => ({})) as {
      sid?: string
      status?: string
      message?: string
      code?: number
    }

    if (!res.ok) {
      const err = data.message || res.statusText
      let hint = 'Join Twilio sandbox: send join code from your phone to +1 415 523 8886'
      if (String(err).includes('authenticate') || res.status === 401) {
        hint = 'Invalid Twilio credentials — check TWILIO_SID and TWILIO_TOKEN in backend/.env'
      } else if (String(err).includes('63015') || String(err).includes('63016')) {
        hint = 'Your phone has not joined the Twilio WhatsApp sandbox yet.'
      }
      logger.warn('[Twilio]', err)
      return { status: 'error', reason: err, hint }
    }

    const twilioStatus = data.status || 'queued'
    let hint: string | undefined
    if (twilioStatus === 'queued') {
      hint = `Queued to ${to}. Join Twilio sandbox if you don't receive within 2 min.`
    }

    return {
      status: twilioStatus === 'failed' ? 'error' : 'sent',
      sid: data.sid,
      to,
      twilio_status: twilioStatus,
      hint,
    }
  } catch (err) {
    logger.error('[Twilio] send failed:', err)
    return { status: 'error', reason: err instanceof Error ? err.message : 'Twilio request failed' }
  }
}

async function sendWhatsAppViaPython(phone: string, message: string): Promise<WhatsAppSendResult | null> {
  const base = process.env.PYTHON_API_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${base}/notify/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    })
    if (!res.ok) return null
    return await res.json() as WhatsAppSendResult
  } catch {
    return null
  }
}

/** Node Twilio first; Python API fallback if Node skipped. */
export async function sendWhatsAppReliable(phone: string, message: string): Promise<WhatsAppSendResult> {
  const direct = await sendWhatsApp(phone, message)
  if (direct.status !== 'skipped') return direct
  const viaPython = await sendWhatsAppViaPython(phone, message)
  return viaPython ?? direct
}
