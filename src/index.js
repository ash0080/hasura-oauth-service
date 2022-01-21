require('dotenv')
  .config()
const prettifier = require('@mgcrea/pino-pretty-compact').default
const fastifyRequestLogger = require('@mgcrea/fastify-request-logger').default
const grant = require('grant')
  .fastify()
const session = require('fastify-secure-session')
const fastifyJwt = require('fastify-jwt')
const fastifyHasura = require('@ash0080/fastify-hasura')
const fastifyCron = require('fastify-cron')
const {
  getAuthVersion, prepareDatabase,
} = require('./controllers/sql')
const prepareMetadata = require('./controllers/metadata')
const mountCronJobs = require('./controllers/cron')
const Redis = require('ioredis')
const delay = require('delay')
//const {token} = require('./config/redis')
const tokenRedis = new Redis(process.env.REDIS_URL, {db: 0})
const rateRedis = new Redis(process.env.REDIS_URL, {
  connectTimeout      : 500, // For Rate limiting
  maxRetriesPerRequest: 1, db: 1,
})

const buildFastify = async () => {
  try {
    const app = require('fastify')({
                                     trustProxy           : true,
                                     logger               : process.env.LOG_LEVEL ? {
                                       logLevel   : process.env.LOG_LEVEL,
                                       prettyPrint: true,
                                       prettifier,
                                     } : null,
                                     disableRequestLogging: true,
                                   })
    await app.register(require('fastify-rate-limit'), require('./config/ratelimit')(rateRedis))
    app.register(require('fastify-redis'), {client: tokenRedis, namespace: 'token'})
       .register(require('fastify-redis'), {client: rateRedis, namespace: 'rate'})
       .register(fastifyCron)
       .register(fastifyRequestLogger)
       .register(require('fastify-sensible'))
       .register(fastifyHasura, require('./config/hasura'))
       .register(session, require('./config/session'))
       .register(fastifyJwt, require('./config/jwt'))
       .addHook('onRequest', (req, res, next) => {
         Object.defineProperty(req.session, 'grant', {
           get: () => req.session.get('grant'), set: (value) => req.session.set('grant', value),
         })
         next()
       })
       .setNotFoundHandler({preHandler: app.rateLimit()}, (req, res) => {
         res.code(404).send('not found')
       })
       .register(grant(require('./config/grant.js')))
       .register(require('./routes'))

    return app
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const start = async () => {
  const app = await buildFastify()
  let hasPrepared = true
  let hasuraIsReady = false
  let retryCnt = 0
  // TODO: add a health check and wait hasura prepared
  // TODO: update twitter oauth 2.0
  while (!hasuraIsReady && retryCnt < 10) {
    retryCnt++
    try {
      hasuraIsReady = await app.hasura.healthz()
    } catch (err) {
      console.error(`Waiting for hasura to be ready, tried ${retryCnt} time, try again after 10 seconds...`)
    }
    if (!hasuraIsReady) {
      await delay(10 * 1000)
    }
  }
  if (!hasuraIsReady) {
    throw new Error('Hasura is not ready, terminate operation ☠️')
    process.exit(1)
  }
  try {
    const resp = await getAuthVersion(app.hasura.schema)
    const version = resp?.result?.[1]?.[0]
    if (version < process.env.CHECK_VERSION) {
      hasPrepared = false
    }
    app.log.info(`Cloud Version: ${resp?.result?.[1]?.[0]}`)
    app.log.info(`Local Version: ${resp?.result?.[1]?.[0]}`)
  } catch (err) {
    app.log.error(err.response)
    if (err.response.error === 'query execution failed') {
      hasPrepared = false
    }
  }
  // DONE: try migrating
  if (!hasPrepared) {
    try {
      await prepareDatabase(app.hasura.schema)
      app.log.info('Database Prepared 👌')
      await prepareMetadata(app)
      app.log.info('Metadata prepared 👌')
      hasPrepared = true
    } catch (err) {
      app.log.error(err.response)
    }
  }
  if (hasPrepared) {
    mountCronJobs(app)
    app.log.info('Auth-Service Prepared 👌')
    try {
      await app.listen(process.env.PORT, '0.0.0.0')
      app.cron.startAllJobs()
      app.log.info(`server listening on ${app.server.address().port}`)
    } catch (err) {
      app.log.error(err)
      process.exit(1)
    }
  } else {
    app.log.error('Service not prepared, Maybe you should migrate manually first 🤕')
  }
  // TODO: switch to typescript?
  // TODO: more tests and mock
  // DONE: set jwk into hasura
  // DONE: add rate-limiting
}

start()
module.exports = buildFastify
