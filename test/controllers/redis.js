const {
        addToken,
        getToken,
        updateUserData,
        deleteUserData,
      } = require('../../src/controllers/redis')
const tap = require('tap')
const app = require('../../src')
const delay = require('delay')

tap.before(async () => {
  await app.ready()
})

tap.teardown(async () => {
  try {
    await app.redis.quit()
    await app.close()
  } catch (err) {
  }
})

tap.test('redis contollers', async t => {
  const {redis} = app
  t.test('addToken', async t => {
    const resp = await addToken(redis, 'token1', 'fingerprint', {
      user_id: 'userid',
      bio: 'bio',
      nickname: 'nickname',
      avatar_url: 'url',
    })
    t.type(resp, Array, 'add a token should be excuted')
  })
  t.test('getToken', async t => {
    const resp = await getToken(redis, 'token1')
    app.log.info(resp)
    t.equal(Object.keys(resp)
                  .includes('user_id', 'fingerprint', 'bio', 'nickname', 'avatar_url'),
            true,
            'getToken should return an composited object')
  })
  t.test('updateUserData', async t => {
    const resp = await updateUserData(redis, 'userid', {
      nickname: 'jim',
      bio: 'bio_changed',
      avatar_url: 'url_changed',
      //user_id: 'userid',
    })
    app.log.info(resp)
    t.equal(resp, 'OK', 'update an exist user should be excuted')
  })

  t.test('updateUserData', async t => {
    const resp = await updateUserData(redis, 'userid2', {})
    t.equal(resp, 'PASS', 'update a not exist cache should be pass')
  })
})

tap.test('expiration', async t => {
  const {redis} = app
  const user = {
    user_id: 'userid',
    bio: 'bio',
    nickname: 'nickname',
    avatar_url: 'url',
  }
  //
  await addToken(redis, 'token1', 'fingerprint1', user, 1)
  await addToken(redis, 'token2', 'fingerprint2', user, 2)
  await delay(1001)
  const tokenResp = await redis.hgetall(`token::token1`)
  const userResp = await redis.hgetall(`user::userid`)
  const ttl = await redis.ttl(`user::userid`)
  await delay(1001)
  const userResp2 = await redis.hgetall(`user::userid`)
  t.same(tokenResp, {})
  t.notSame(userResp, {})
  t.equal(ttl, 1)
  t.same(userResp2, {})
})

tap.test('exceptions', async t => {
  const {redis} = app
  await addToken(redis, 'token3', 'fingerprint3', {
    user_id: 'userid3',
  })
  t.same(await getToken(redis, 'token4'), {})
  await deleteUserData(redis, 'userid3')
  t.same(await getToken(redis, 'token3'), {})
  t.same(await redis.hgetall(`token::token3`), {})
})
