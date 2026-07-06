import dns from 'node:dns'
import dnsPromises from 'node:dns/promises'
import mongoose from 'mongoose'
import { logger } from '../utils/logger'
import { config } from './env'

dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

let connecting = false
let retryTimer: ReturnType<typeof setInterval> | null = null

export const isDbConnected = () => mongoose.connection.readyState === 1

function maskUri(uri: string) {
  return uri.replace(/:([^:@/]+)@/, ':****@')
}

async function srvUriToDirect(srvUri: string): Promise<string | null> {
  const m = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/)
  if (!m) return null
  const [, creds, host, db = 'prepup', qs = ''] = m
  try {
    const records = await dnsPromises.resolveSrv(`_mongodb._tcp.${host}`)
    if (!records.length) return null
    const seeds = records.map(r => `${r.name}:${r.port}`).join(',')
    const params = new URLSearchParams(qs)
    if (!params.has('ssl')) params.set('ssl', 'true')
    if (!params.has('authSource')) params.set('authSource', 'admin')
    const replica = process.env.MONGODB_REPLICA_SET || 'atlas-vgsw9q-shard-0'
    if (!params.has('replicaSet')) params.set('replicaSet', replica)
    return `mongodb://${creds}@${seeds}/${db}?${params.toString()}`
  } catch (err) {
    logger.warn(`SRV resolve failed for ${host}: ${(err as Error).message}`)
    return null
  }
}

async function connectionCandidates(): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()

  const add = (uri: string | undefined) => {
    if (!uri || seen.has(uri)) return
    seen.add(uri)
    out.push(uri)
  }

  if (config.mongodb.uriDirect) add(config.mongodb.uriDirect)

  const built = await srvUriToDirect(config.mongodb.uri)
  if (built) add(built)

  add(config.mongodb.uri)

  return out
}

async function tryConnect(uri: string): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      maxPoolSize: 10,
      retryWrites: true,
    })
    const { host, name } = mongoose.connection
    logger.info(`MongoDB connected (${maskUri(uri)}): ${host}/${name}`)
    return true
  } catch (error) {
    const msg = (error as Error).message
    logger.warn(`MongoDB attempt failed (${maskUri(uri)}): ${msg.slice(0, 160)}`)
    try { await mongoose.disconnect() } catch { /* ignore */ }
    return false
  }
}

export const connectDB = async (): Promise<boolean> => {
  if (isDbConnected()) return true
  if (connecting) return false

  connecting = true
  let connected = false
  const uris = await connectionCandidates()
  for (const uri of uris) {
    if (await tryConnect(uri)) {
      connected = true
      break
    }
  }
  connecting = false

  if (!connected) {
    logger.error('MongoDB cluster unreachable — verify Atlas Network Access allows your IP')
  }
  return connected
}

export function startDbRetryLoop(onConnected?: () => void) {
  if (retryTimer) return
  retryTimer = setInterval(async () => {
    if (isDbConnected()) return
    const ok = await connectDB()
    if (ok && onConnected) onConnected()
  }, 15000)
}

export const disconnectDB = async () => {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  if (!isDbConnected()) return
  await mongoose.disconnect()
  logger.info('MongoDB disconnected')
}

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  if (connecting) return
  logger.error('Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected from MongoDB')
})
