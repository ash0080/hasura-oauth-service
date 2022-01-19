const tokenKey = (token) => `token::${token}`
const userKey = (userId) => `user::${userId}`
const isEmpty = (obj) => Object.keys(obj).length === 0
const ms = require('ms')
const _expiredIn = Math.floor(ms(process.env.REFRESH_EXPIRED_IN || '15d') / 1000)
const addToken = async (redis, token, fingerprint, data, expiredIn = _expiredIn) => {
  const user_id = data.user_id
  return await redis.pipeline()
                    .hmset(tokenKey(token), {
                      user_id,
                      fingerprint,
                    })
                    .expire(tokenKey(token), expiredIn)
                    .hmset(userKey(user_id), data)
                    .expire(userKey(user_id), expiredIn)
                    .exec()

}

const getToken = async (redis, token, deep = true) => {
  try {
    const tokenData = await redis.hgetall(tokenKey(token))
    if (isEmpty(tokenData)) {
      return {}
    } else if (!deep) {
      return tokenData
    }
    const userData = await redis.hgetall(userKey(tokenData.user_id))
    if (isEmpty(userData)) {
      await redis.del(tokenKey(token))
      return {}
    }
    return Object.assign(tokenData, userData)
  } catch (err) {
    return {}
  }
}

const updateUserData = async (redis, user_id, data) => {
  const isExist = await redis.exists(userKey(user_id))
  if (isExist) {
    const pipeline = redis.pipeline()
    for (const key in data) {
      pipeline.hset(userKey(user_id), key, data[key])
    }
    return await pipeline.exec()
  }
  return 'PASS'
}

const updateUserRole = async (redis, user_id, role) => {
  const isExist = await redis.exists(userKey(user_id))
  if (isExist) {
    return await redis.hset(userKey(user_id), 'role', role)
  }
  return 'PASS'
}

const deleteUserData = async (redis, user_id) => {
  return await redis.del(userKey(user_id))
}

const removeToken = async (redis, token) => {
  return await redis.del(tokenKey(token))
}

const renameToken = async (redis, token, newToken) => {
  return await redis.rename(token, newToken)
}

module.exports = {
  addToken,
  getToken,
  renameToken,
  removeToken,
  updateUserData,
  updateUserRole,
  deleteUserData,
}
