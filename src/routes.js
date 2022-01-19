// this is the endpoint for a user logged in to the app to get a token
// you should mainipulate the database, redis, and return

const {
  signin,
  refresh, revoke,
} = require('./controllers/user')
const {events, EventParser} = require('./controllers/events')

module.exports = (fastify, opts, done) => {
  fastify.get('/token', signin(fastify))
  fastify.post('/refresh', refresh(fastify))
  fastify.post('/revoke', revoke(fastify))
  fastify.post('/events', {
    preHandler: async (req, res) => {
      if (req.body) {
        req.event = new EventParser(req.body)
      }
    },
  }, events(fastify))

  //fastify.post('/crons', async (req, res) => {
  // for cron triggers
  //  return 'ok'
  //})
  fastify.get('/', async (req, res) => {
    //fastify.log.info('~~~~~~~~~~~~~~~~~~~~~')
    //console.log(req.ip)
    //console.log(req.headers['user-agent'])
    //console.log(req.headers['accept-language'])
    //console.log(req.headers['sec-ch-ua'])
    //console.log(req.headers['sec-ch-ua-mobile'])
    //console.log(req.headers['sec-ch-ua-platform'])
    //const query = `
    //   query {
    //      file {
    //        id2
    //        name
    //      }
    //   }`
    //try {
    //  const resp = await fastify.hasura.graphql(query)
    //} catch (err) {
    //  fastify.log.error(err)
    //}
    //fastify.log.warn(fastify.github.signin())
    return 'ok'
  })

  //fastify.inject({
  //                 url: '/events',
  //                 method: 'POST',
  //                 body: require('./mock/event').test,
  //               })
  //fastify.inject({
  //                 url: '/refresh',
  //                 method: 'POST',
  //                 body: {refresh_token: require('./mock/refreshToken')},
  //               })
  //       .then(res => {
  //         fastify.log.info(res.body)
  //       })
  //fastify.inject({
  //                 url: '/token',
  //                 method: 'GET',
  //               })
  //       .then(resp => {
  //         console.dir(resp.body)
  //       })
  done()
}
