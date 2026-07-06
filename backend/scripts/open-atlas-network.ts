import dotenv from 'dotenv'
import { ensureAtlasNetworkAccess, logAtlasNetworkHint } from '../src/services/atlasNetworkAccess'
import { connectDB } from '../src/config/database'

dotenv.config()

async function main() {
  const ip = await logAtlasNetworkHint()
  console.log('\nPrepUp — MongoDB Atlas network access\n')
  if (ip) console.log(`Your public IP: ${ip}`)
  console.log('Atlas → Network Access → Add IP Address (or 0.0.0.0/0 for dev)\n')

  const hasKeys = Boolean(
    process.env.ATLAS_GROUP_ID && process.env.ATLAS_PUBLIC_KEY && process.env.ATLAS_PRIVATE_KEY
  )

  if (hasKeys) {
    console.log('Atlas API keys found — attempting auto-whitelist…')
    await ensureAtlasNetworkAccess()
  } else {
    console.log('Optional: set ATLAS_GROUP_ID, ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY in backend/.env')
    console.log('Set ATLAS_ALLOW_ANYWHERE=1 to allow 0.0.0.0/0 via API.\n')
  }

  console.log('Testing cluster connection…')
  const ok = await connectDB()
  console.log(ok ? 'MongoDB connected.' : 'MongoDB still unreachable — whitelist IP in Atlas, then retry.')
  process.exit(ok ? 0 : 1)
}

main()
