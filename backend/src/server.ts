import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { connectDB, isDbConnected, startDbRetryLoop } from './config/database'
import { config } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import { ensureAtlasNetworkAccess } from './services/atlasNetworkAccess'

import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import assessmentsRoutes from './routes/assessments'
import applicationsRoutes from './routes/applications'
import failuresRoutes from './routes/failures'
import recoveryRoutes from './routes/recovery'
import gapsRoutes from './routes/gaps'
import healthCenterRoutes from './routes/healthCenter'
import notificationRoutes from './routes/notifications'
import resourceRoutes from './routes/resources'
import plannerRoutes from './routes/planner'
import companyRoutes from './routes/companies'
import platformRoutes from './routes/platforms'
import { startInactiveReminderScheduler } from './jobs/inactiveReminderJob'
import { startDigestScheduler } from './jobs/digestSchedulerJob'
import { startDailyChallengeScheduler } from './jobs/dailyChallengeJob'

const app = express()

let schedulersStarted = false
function startSchedulersOnce() {
  if (schedulersStarted) return
  schedulersStarted = true
  startInactiveReminderScheduler()
  startDigestScheduler()
  startDailyChallengeScheduler()
}

app.use(helmet())
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

app.get('/health', async (_req, res) => {
  if (!isDbConnected()) {
    await connectDB()
  }
  const dbConnected = isDbConnected()
  res.status(200).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/assessments', assessmentsRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/failures', failuresRoutes)
app.use('/api/recovery', recoveryRoutes)
app.use('/api/gaps', gapsRoutes)
app.use('/api/health-center', healthCenterRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/planner', plannerRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/platforms', platformRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use(errorHandler)

const startServer = () => {
  const server = app.listen(config.port, () => {
    logger.info(`🚀 PrepUp API running on http://localhost:${config.port}`)
    logger.info(`📝 Environment: ${config.env}`)
    logger.info(`🗄️  Database: connecting…`)

    ensureAtlasNetworkAccess()
      .then(() => connectDB())
      .then((ok) => {
        logger.info(`Database: ${ok ? 'connected' : 'retrying every 15s'}`)
        if (ok) startSchedulersOnce()
      })

    startDbRetryLoop(() => startSchedulersOnce())
  })

  mongoose.connection.on('connected', () => {
    startSchedulersOnce()
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} in use — stop other backend or change PORT in backend/.env`)
      process.exit(1)
    }
    logger.error('Server error:', err)
    process.exit(1)
  })
}

startServer()

export default app
