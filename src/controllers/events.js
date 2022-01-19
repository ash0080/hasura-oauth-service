const {
  updateUserData,
  deleteUserData,
  updateUserRole,
} = require('./redis')

exports.EventParser = class EvnetParser {
  _raw = {}

  constructor(_) {
    this._raw = _
  }

  get name() {
    return this._raw?.trigger?.name
  }

  get data() {
    return this._raw?.event?.data
  }

  get op() {
    return this._raw?.event.op
  }

  get raw() {
    return this._raw
  }

  get session_variables() {
    return this._raw?.event?.session_variables
  }
}

function pick(o, ...fields) {
  return fields.reduce((a, x) => {
    if (o.hasOwnProperty(x)) {
      a[x] = o[x]
    }
    return a
  }, {})
}

function changed(oldObj, newObj) {
  const _r = {}
  for (let k in oldObj) {
    if (oldObj[k] !== newObj [k]) {
      _r[k] = `${newObj [k] || ''}`
    }
  }
  return _r
}

const CASE = {
  async test(app, {name}) {
    app.log.info(`!!![Event Trigger: ${name}]!!!`)
    return 'ok'
  },
  async sync_user_profile(app, {
    op,
    data,
  }) {
    const oldObj = data.old
    const newObj = data.new
    const user_id = newObj.id || oldObj.id
    if (op === 'UPDATE') {
      // DONE: when user update profile, update redis cache
      const c = pick(changed(oldObj, newObj), 'id', 'bio', 'nickname', 'avatar_url', 'locale')
      app.log.info(c)
      await updateUserData(app.redis.token, user_id, c)
    } else if (op === 'DELETE') {
      // DONE: when user delete/or logout, delete redis cache
      await deleteUserData(app.redis.token, user_id)
    }
    return 'ok'
  },
  async sync_user_role(app, {
    data,
  }) {
    const {
      user_id,
      role,
    } = data.new
    await updateUserRole(app.redis.token, user_id, role)
    return 'ok'
  },
}
exports.events = (app) => async (req, res) => {
  try {
    if (req.headers['x-auth-service-secret'] !== process.env.TRIGGER_SECRET) {
      return app.httpErrors.unauthorized('Not allowed')
    }
    const name = req?.event?.name
    const op = req?.event?.op
    const data = req?.event?.data
    if (!name || !op || data) {
      return 'pass'
    }
    if (CASE[name]) {
      return await CASE[name](app, {
        name,
        op,
        data,
      })
    }
    return 'no match'
  } catch (err) {
    throw app.httpErrors.serviceUnavailable(err)
  }
}
