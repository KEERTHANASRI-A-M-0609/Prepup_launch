import dotenv from 'dotenv'
import dns from 'node:dns/promises'
import mongoose from 'mongoose'

dotenv.config()

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

function mask(uri: string) {
  return uri.replace(/:([^:@]+)@/, ':****@').slice(0, 90)
}

async function srvToDirect(srvUri: string): Promise<string | null> {
  const m = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/)
  if (!m) return null
  const [, creds, host, db = 'prepup', qs = ''] = m
  const records = await dns.resolveSrv(`_mongodb._tcp.${host}`)
  if (!records.length) return null
  const seeds = records.map(r => `${r.name}:${r.port}`).join(',')
  const params = new URLSearchParams(qs)
  if (!params.has('ssl')) params.set('ssl', 'true')
  if (!params.has('authSource')) params.set('authSource', 'admin')
  const replica = process.env.MONGODB_REPLICA_SET || 'atlas-vgsw9q-shard-0'
  if (!params.has('replicaSet')) params.set('replicaSet', replica)
  return `mongodb://${creds}@${seeds}/${db}?${params.toString()}`
}

async function tryConnect(uri: string) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, maxPoolSize: 10, retryWrites: true })
  console.log('OK', mask(uri))
  await mongoose.disconnect()
}

async function main() {
  const srv = process.env.MONGODB_URI!
  const direct = process.env.MONGODB_URI_DIRECT!
  try {
    const built = await srvToDirect(srv)
    if (built) {
      console.log('Built direct from SRV:', mask(built))
      await tryConnect(built)
    }
  } catch (e) {
    console.log('Built direct FAIL', (e as Error).message.slice(0, 200))
  }
  try {
    await tryConnect(direct)
  } catch (e) {
    console.log('Env direct FAIL', (e as Error).message.slice(0, 200))
  }
}

main()
