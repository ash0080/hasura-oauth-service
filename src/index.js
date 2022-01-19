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
//const {token} = require('./config/redis')
const tokenRedis = new Redis(process.env.REDIS_URL, {db: 0})
const rateRedis = new Redis(process.env.REDIS_URL, {
  connectTimeout      : 500, // For Rate limiting
  maxRetriesPerRequest: 1, db: 1,
})

function buildFastify() {
  const app = require('fastify')({
                                   trustProxy           : true,
                                   logger               : process.env.LOG_LEVEL ? {
                                     logLevel   : process.env.LOG_LEVEL,
                                     prettyPrint: true,
                                     prettifier,
                                   } : null,
                                   disableRequestLogging: true,
                                 })
    .register(require('fastify-redis'), {client: tokenRedis, namespace: 'token'})
    .register(require('fastify-redis'), {client: rateRedis, namespace: 'rate'})
    .register(require('fastify-rate-limit'), require('./config/ratelimit')(rateRedis))
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
    .register(grant(require('./config/grant.js')))
    .register(require('./routes'))
  return app
}

const app = buildFastify()

const start = async () => {
  await app.ready()
  let hasPrepared = true
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
module.exports = app
exports.buildFastify = buildFastify
