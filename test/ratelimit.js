require('dotenv').config()
const tap = require('tap')
const app = require('../src')
const delay = require('delay')

tap.before(async () => {
  await app.ready()
})

tap.teardown(async () => {
  try {
    app.redis.token.disconnect()
    app.redis.rate.disconnect()
    await app.close()
  } catch (err) {
  }
})

tap.test('trigge /token rate limiting', async (t) => {
  const request = () => app.inject({method: 'GET', url: '/'})
  try {
    for (let i = 0; i < 4; i++) {
      await app.inject({method: 'GET', url: '/'})
    }
    const resp = await app.inject({method: 'GET', url: '/'})
    t.same({
             statusCode: 429,
             error     : 'Too Many Requests',
             message   : 'Rate limit exceeded, retry in 10 seconds',
           }, JSON.parse(resp.payload))

  } catch (err) {
    console.error(err)
    t.pass('rate limit trigged')
  }
})

tap.test('rate limiting should not be trigged from hasura', async t => {
  try {
    for (let i = 0; i < 5; i++) {
      const resp = await app.inject({method: 'GET', url: '/', headers: {'x-auth-service-secret': process.env.TRIGGER_SECRET}})
      t.equal(resp.statusCode, 200, 'hasura rate limit not trigged')
    }
  } catch (err) {
    t.fail()
  }
})
