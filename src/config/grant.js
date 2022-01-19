// raw, response会直接返回原url，不要用

class defaultMapper {
  constructor(response) {
    this.r = response
  }

  get data() {
    const u = {}
    this.provider_user_id ? u.provider_user_id = this.provider_user_id : null
    this.nickname ? u.nickname = this.nickname : null
    this.avatar_url ? u.avatar_url = this.avatar_url : null
    this.bio ? u.bio = this.bio : null
    this.email ? u.email = this.email : null
    return u
  }

  get provider_user_id() {
    return `${this.r?.profile?.id || ''}`
  }

  get nickname() {
    return `${this.r?.profile?.name || ''}`
  }

  get avatar_url() {
    return `${this.r?.profile?.avatar_url || ''}`
  }

  get bio() {
    return `${this.r?.profile?.bio || ''}`
  }

  get email() {
    return `${this.r?.profile?.email || ''}`
  }
}

class googleMapper
  extends defaultMapper {
  constructor(response) {
    super(response)
  }

  get provider_user_id() {
    return `${this.r?.profile?.sub || ''}`
  }

  get avatar_url() {
    return `${this.r?.profile?.picture || ''}`
  }
}

class twitterMapper
  extends defaultMapper {
  constructor(response) {super(response)}

  get provider_user_id() {return `${this.r?.raw?.user_id || ''}`}

  get nickname() {return `${this.r?.raw?.screen_name || ''}`}
}

const defaultConfig = {
  defaults: {
    origin   : process.env.SERVICE_ORIGIN,
    prefix   : process.env.ROUTE_PREFIX,
    transport: 'session', state: true, nonce: true,
    callback : '/token',
    mapper   : (r) => new defaultMapper(r),
  },
}
//http://82c0-103-97-200-246.ngrok.io/connect/twitter

const providersConfit = {
  github  : {
    key          : process.env.GITHUB_CLIENT_ID,
    secret       : process.env.GITHUB_CLIENT_SECRET,
    scope        : ['read:user', 'user:email', 'offline_access'],
    response     : ['tokens', 'profile'],
    custom_params: {'access_type': 'offline'},
  },
  google  : {
    key   : process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
    //authorize_url   : 'https://accounts.google.com/o/oauth2/v2/auth',
    access_url: 'https://oauth2.googleapis.com/token',
    //callback     : '/token',
    custom_params: {access_type: 'offline'},
    'scope'      : [
      'openid',
      'email',
      'profile',
    ],
    'response'   : ['tokens', 'profile'],
    mapper       : (r) => new googleMapper(r),
  },
  facebook: {
    key     : process.env.FACEBOOK_CLIENT_ID,
    secret  : process.env.FACEBOOK_CLIENT_SECRET,
    scope   : ['public_profile'],
    response: ['tokens', 'profile'],
  },
  twitter : {
    key     : process.env.TWITTER_CLIENT_ID,
    secret  : process.env.TWITTER_CLIENT_SECRET,
    response: ['tokens', 'raw'],
    mapper  : (r) => new twitterMapper(r),
  },
  //wechat  : {
  //  key     : process.env.WECHAT_CLIENT_ID,
  //  secret  : process.env.WECHAT_CLIENT_SECRET,
  //  scope   : ['snsapi_userinfo'],
  //  response: ['tokens', 'profile'],
  //  //scope        : [],
  //  //custom_params: {access_type: 'offline'},
  //  //response     : [],
  //},
}

const availableProviders = process.env.AVAILABLE_PROVIDERS.split(/\s*,\s*/)
for (const provider of availableProviders) {
  if (providersConfit[provider]) {
    defaultConfig[provider] = providersConfit[provider]
  }
}

module.exports = defaultConfig

// DONE: add other grands
// DONE: change prefix to /oauth ?
//http://localhost:3009/oauth/google
//http://localhost:3009/oauth/github
//http://localhost:3009/oauth/facebook
//http://08a2-103-97-200-246.ngrok.io/oauth/twitter
//http://sealight.cc:3009/oauth/wechat
