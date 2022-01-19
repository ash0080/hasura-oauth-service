/**
 * DONE: signin
 *    DONE:  获取用户信息
 *    DONE:  生成或更新用户数据(入库)
 *    DONE:  返回一个包含claims的JWT
 */
// DONE: 验证不需要，因为是在hasura完成, hasura鉴权失败如何跳转? 客户端如何完成？目前只能前端轮询
const config = require('../config/grant')
const pick = require('lodash/pick')
const omit = require('lodash/omit')
const ms = require('ms')

const {
  GET_USER_PROVIDER, INSERT_USER, UPDATE_USER, INSERT_USER_PROVIDER, UPGRATE_TO_SUBSCRIBER,
} = require('../schema')
const {
  genFingerPrint, isValidate,
} = require('./fingerPrint')
const {
  addToken, getToken, renameToken, removeToken,
} = require('./redis')
const {
  genAccessToken, genRefreshToken,
} = require('./jwt')
const {nanoid} = require('nanoid')
const {providerEnumValues, roleEnumValues} = require('./enumValues')
const {parse} = require('dotenv')

exports.signin = (app) => async (req, res) => {
  const payload = req?.session?.grant || JSON.parse(req?.raw?._lightMyRequest?.payload)
  // console.dir(payload)
  // console.dir(payload.provider)
  if (!payload) {
    throw app.httpErrors.failedDependency()
  }
  const provider = payload.provider
  const response = payload.response
  const allowedProviders = await providerEnumValues(app.hasura.graphql)
  //console.log(allowedProviders, provider)
  if (!allowedProviders.includes(provider)) {
    throw app.httpErrors.notAcceptable('This provider it not listed in database')
  }
  req.session.delete()   // DONE: 完成后删除session
  // console.dir(response)
  const userData = (config?.[provider]?.mapper || config.defaults.mapper)(response).data

  if (!provider || !userData.provider_user_id) {
    throw app.httpErrors.unauthorized('Failed to get provider\'s user_id')
  }
  userData.provider = provider
  // console.log('check 1', userData)
  // STEP 0: decorate avatar_url
  try {
    // STEP1: interact with database
    const userProviderResp = await app.hasura.graphql(GET_USER_PROVIDER, pick(userData, ['provider', 'provider_user_id']))
    const user_id = userProviderResp?.auth_user_provider?.[0]?.user_id
    //let userId, userRole
    // console.dir(userProviderResp)
    //return 'ok'
    // console.log('~~~~~~~~~~~~~~~~')
    if (user_id) {
      // console.log('exists')
      userData.id = userData.user_id = user_id
      // DONE: if provider exists, update user
      // console.dir(pick(userData, ['id', 'nickname', 'email']))
      const updateResp = await app.hasura.graphql(UPDATE_USER, {id: userData.id, set: pick(userData, ['nickname', 'email'])})
      const updated = updateResp?.update_auth_user_by_pk
      updated?.user_role?.role ? userData.role = updated.user_role.role : null
      updated.bio ? userData.bio = updated.bio : null
      updated.nickname ? userData.nickname = updated.nickname : null
      updated.avatar_url ? userData.avatar_url = updated.avatar_url : null
    } else {
      // console.log('not exists')
      // DONE: else create new user
      // console.log('check 2', omit(userData, ['provider_user_id', 'provider']))
      const insertResp = await app.hasura.graphql(INSERT_USER, omit(userData, ['provider_user_id', 'provider']))
      userData.id = userData.user_id = insertResp?.insert_auth_user_one?.id
      // console.dir(pick(userData, ['user_id', 'provider', 'provider_user_id']))
      const insertUserProviderResp = await app.hasura.graphql(INSERT_USER_PROVIDER, pick(userData, ['user_id', 'provider', 'provider_user_id']))
      userData.role = 'user'
      req.log.info(insertUserProviderResp)
    }
    // console.log('~~~~~~~~~~~~~~~~')

    // console.log(userData)
    // STEP2: generate refresh token
    const key = nanoid(16)
    const fingerprint = genFingerPrint(req)
    req.log.info(key, fingerprint)
    const clearData = pick(userData, ['user_id', 'role', 'nickname', 'avatar_url', 'bio'])
    await addToken(app.redis.token, key, fingerprint, clearData)
    const roles = await roleEnumValues(app.hasura.graphql)
    const access_token = await genAccessToken(app.jwt, roles, userData)
    const refresh_token = await genRefreshToken(app.jwt, key)
    return {
      access_token, refresh_token,
    }
  } catch (err) {
    // console.error(err)
    throw app.httpErrors.serviceUnavailable(err)
  }
}

exports.refresh = (app) => async (req, res) => {
  const {refresh_token} = req.body
  if (!refresh_token) {
    throw app.httpErrors.notAcceptable()
  }
  try {
    const {
      key, exp,
    } = app.jwt.verify(refresh_token)
    app.log.info(key)
    // DONE: else get user info from hasura
    const cachedUser = await getToken(app.redis.token, key)
    //const cachedUser = await app.redis.token.hgetall(key)
    app.log.info(cachedUser)
    if (!isValidate(req, cachedUser.fingerprint, 0.7)) {
      await removeToken(app.redis.token, key)
      throw app.httpErrors.unauthorized('Unable to confirm user identity')
    }
    const roles = await roleEnumValues(app.hasura.graphql)
    const access_token = genAccessToken(app.jwt, roles, cachedUser)
    //const token = app.jwt.sign(tokenPayload, {expiresIn: '1h'})
    const expMs = exp * 1000 - Date.now()
    let results = {access_token}
    if (expMs < ms(process.env.REGEN_REFRESH_BEFORE || 7)) {
      // DONE: if refresh_token expired in 7 days, regenerate refresh_token?
      const newKey = nanoid(16)
      const refresh_token = genRefreshToken(app.jwt, newKey)
      const redisResp = await renameToken(app.redis.token, key, newKey)
      req.log.info(redisResp)
      results.refresh_token = refresh_token
    }
    return results
  } catch (err) {
    req.log.error(err)
    throw err
  }
}

// TODO: maybe lua scripts for better cache handlering
exports.revoke = (app) => async (req, res) => {
  const {refresh_token} = req.body
  if (!refresh_token) {
    throw app.httpErrors.notAcceptable()
  }
  try {
    const {key} = app.jwt.verify(refresh_token)
    await removeToken(app.redis.token, key)
    return {success: true}
  } catch (err) {
    req.log.error(err)
    throw err
  }
}

exports.cronTrigger = (app) => async (req, res) => {
  //const resp = await
  return []
}
