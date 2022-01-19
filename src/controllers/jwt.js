//TODO: Maybe need other fields
const pick = require('lodash/pick')
const genAccessToken = (jwt, roles, userData, expiresIn = process.env.ACCESS_EXPIRED_IN || '1h') => {
  const payload = {
    [process.env.CLAIMS_SPACE]: {
      'x-hasura-allowed-roles': roles,
      'x-hasura-user-id'      : userData.user_id,
      'x-hasura-default-role' : userData.role,
    },
    user                      : pick(userData, ['nickname', 'avatar_url', 'bio']),
  }

  return jwt.sign(payload, {expiresIn})
}

const genRefreshToken = (jwt, key, expiresIn = process.env.REFRESH_EXPIRED_IN || '15d') => {
  return jwt.sign({key}, {expiresIn})
}

const verifyToken = (jwt, token) => {
  return jwt.verify(token)
}

module.exports = {
  genAccessToken,
  genRefreshToken,
  verifyToken,
}
