require('dotenv').config()
const {
  signin,
} = require('../../src/controllers/user')
const tap = require('tap')
const app = require('../../src')
const delay = require('delay')
const {
  google, github, facebook, twitter,
} = require('../../src/mock/provider')

tap.before(async () => {
  await app.ready()
})

tap.teardown(async () => {
  try {
    await app.close()
  } catch (err) {
  }
})

const mocks = [facebook, twitter, github, google]
tap.test('oauth / refresh', t => {
           //const mocks = [facebook, github, google, twitter]

           for (let provider of mocks) {
             let refresh_token, oldJwt
             t.test(provider.provider, async t => {
               try {
                 const resp = await app.inject({
                                                 url: '/token', method: 'GET', payload: provider,
                                               })
                 const payload = JSON.parse(resp.body)

                 t.ok(payload.access_token, 'access_token exists')
                 t.ok(payload.refresh_token, 'refresh_token exists')
                 const jwt = app.jwt.decode(payload.access_token)
                 refresh_token = payload.refresh_token
                 oldJwt = jwt
                 for (let k in jwt.user) {
                   t.ok(jwt.user[k], `${jwt.user[k]} not empty`)
                 }
               } catch (err) {
                 t.comment(err)
                 t.fail(err)
               }
             })
             t.test(`refresh token for ${provider.provider}`, async t => {
                try {
                  const resp = await app.inject({
                                                  url   : '/refresh',
                                                  method: 'POST',
                                                  body  : {refresh_token},
                                                })
                  const {access_token} = JSON.parse(resp.body)
                  const jwt = app.jwt.decode(access_token)
                  t.same(jwt['sealight.newwork.cc'], oldJwt['sealight.newwork.cc'], '[sealight.newwork.cc] is same')
                  t.same(jwt.user, oldJwt.user, 'user is same')
                } catch
                  (err) {
                  t.comment(err)
                  t.fail(err)
                }
              },
             )
           }
           t.end()
         },
)
