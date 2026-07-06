import nodemailer from 'nodemailer'
import type Transporter from 'nodemailer/lib/mailer'
import { logger } from '../utils/logger'

function readSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim() || `PrepUp <${user || 'noreply@prepup.local'}>`
  const configured = Boolean(host && user && pass)
  return { host, port, user, pass, from, configured }
}

function getTransporter(): Transporter | null {
  const { host, port, user, pass, configured } = readSmtpConfig()
  if (!configured || !host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<{ sent: boolean; mode: 'smtp' | 'logged'; delivered: boolean; hint?: string }> {
  if (!to?.trim()) return { sent: false, mode: 'logged', delivered: false, hint: 'No email address on account.' }

  const { from, configured } = readSmtpConfig()
  const transporter = getTransporter()

  const bodyHtml = html ?? `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600">${subject}</p>
    <p style="margin:0;color:#334155;white-space:pre-line">${text}</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="margin:0;font-size:12px;color:#64748b">PrepUp — Level up your prep</p>
  </div>`

  if (!configured || !transporter) {
    logger.info(`[Email] (SMTP not configured) To: ${to} | ${subject}`)
    logger.info(`[Email] ${text}`)
    return {
      sent: true,
      mode: 'logged',
      delivered: false,
      hint: 'SMTP not configured — set SMTP_USER and SMTP_PASS in backend/.env, then restart the backend.',
    }
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[PrepUp] ${subject}`,
      text,
      html: bodyHtml,
    })
    logger.info(`[Email] Sent to ${to}: ${subject}`)
    return { sent: true, mode: 'smtp', delivered: true }
  } catch (err) {
    logger.error('[Email] Send failed:', err)
    return {
      sent: false,
      mode: 'smtp',
      delivered: false,
      hint: 'SMTP send failed — use a Gmail App Password (not your normal password).',
    }
  }
}

export function isEmailConfigured() {
  return readSmtpConfig().configured
}
