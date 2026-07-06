import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { logger } from '../utils/logger'

const execFileAsync = promisify(execFile)

async function getPublicIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=text', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const ip = (await res.text()).trim()
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : null
  } catch {
    return null
  }
}

async function atlasDigestPost(groupId: string, body: unknown): Promise<boolean> {
  const publicKey = process.env.ATLAS_PUBLIC_KEY
  const privateKey = process.env.ATLAS_PRIVATE_KEY
  if (!publicKey || !privateKey) return false

  try {
    const { stdout, stderr } = await execFileAsync('curl.exe', [
      '--user', `${publicKey}:${privateKey}`,
      '--digest',
      '-s',
      '-w', '\n%{http_code}',
      '-X', 'POST',
      `https://cloud.mongodb.com/api/atlas/v2/groups/${groupId}/accessList`,
      '-H', 'Content-Type: application/json',
      '-H', 'Accept: application/vnd.atlas.2023-01-01+json',
      '-d', JSON.stringify(body),
    ], { timeout: 25000 })

    const lines = (stdout + stderr).trim().split('\n')
    const code = lines[lines.length - 1]?.trim()
    return code === '200' || code === '201' || code === '409'
  } catch (err) {
    logger.warn(`Atlas network API failed: ${(err as Error).message}`)
    return false
  }
}

/** Whitelist current IP (and optional dev-wide access) on Atlas before connecting. */
export async function ensureAtlasNetworkAccess(): Promise<void> {
  const groupId = process.env.ATLAS_GROUP_ID
  if (!groupId || !process.env.ATLAS_PUBLIC_KEY || !process.env.ATLAS_PRIVATE_KEY) {
    const ip = await getPublicIp()
    if (ip) {
      logger.info(`Atlas: add IP ${ip} in Network Access (or set ATLAS_* keys for auto-whitelist)`)
    }
    return
  }

  const entries: { ipAddress?: string; cidrBlock?: string; comment: string }[] = []

  if (process.env.ATLAS_ALLOW_ANYWHERE === '1') {
    entries.push({ cidrBlock: '0.0.0.0/0', comment: 'PrepUp dev — allow anywhere' })
  }

  const ip = await getPublicIp()
  if (ip) {
    entries.push({ ipAddress: ip, comment: 'PrepUp auto-whitelist on startup' })
  }

  if (!entries.length) return

  const ok = await atlasDigestPost(groupId, entries)
  if (ok) {
    logger.info(`Atlas network access updated${ip ? ` (IP ${ip})` : ''}`)
    await new Promise(r => setTimeout(r, 4000))
  }
}

export async function logAtlasNetworkHint(): Promise<string | null> {
  return getPublicIp()
}
