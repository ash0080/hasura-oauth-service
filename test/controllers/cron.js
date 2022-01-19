const tap = require('tap')
const {
        runCleanEvents,
        runDowngradeExpiredSubscriber,
      } = require('../../src/controllers/cron')
const app = require('../../src')

tap.before(async () => {
  await app.ready()
})

tap.teardown(async () => {
  try {
    await app.close()
  } catch (err) {
  }
})

tap.test('runCleanEvents', async (t) => {
  await runCleanEvents(app)
  t.pass()
})
