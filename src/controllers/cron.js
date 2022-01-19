const {DOWNGRADE_EXPIRED_SUBSCRIBER} = require('../schema')
const {cleanEvents} = require('./sql')

const runDowngradeExpiredSubscriber = async (app) => {
  try {
    const resp = await app.hasura.graphql(DOWNGRADE_EXPIRED_SUBSCRIBER)
    app.log.info(`${resp?.auth_downgrade_expired_subscriber?.length} users downgraded`)
  } catch (err) {
    app.log.error(err.message)
  }
}

const runCleanEvents = async (app) => {
  try {
    const resp = await cleanEvents(app.hasura.schema)
    let eventsCnt = 0,
      invocationsCnt = 0
    for (let r of resp) {
      const t = r?.result?.[1]?.[0]?.slice(1, -1)
                                   ?.split(',')
      eventsCnt
        += parseInt(t?.[0] || 0)
      invocationsCnt
        += parseInt(t?.[1] || 0)
    }
    app.log.info(`clean ${eventsCnt} events, ${invocationsCnt} invocations`)
  } catch (err) {
    app.log.error(err.message)
  }
}

const runTest = async () => {
  console.log(`Cron Test: ${Math.floor(Math.random() * 100)}`)
}

const cron = module.exports
  = (app) => {
  app.cron.createJob({
                       //name    : 'clean_events',
                       cronTime: process.env.CRON_CLEAN_EVENTS,  // every hour
                       onTick  : () => runDowngradeExpiredSubscriber(app),
                     })
  // DONE: cleanup logs
  app.cron.createJob({
                       //name    : 'downgrade_expired_subscriber',
                       cronTime: process.env.CRON_DOWNGRADE_EXPIRED_SUBSCRIBER, // 2am/day
                       onTick  : () => runCleanEvents(app),
                     })
}

cron.runDowngradeExpiredSubscriber
  = runDowngradeExpiredSubscriber
cron.runCleanEvents
  = runCleanEvents
