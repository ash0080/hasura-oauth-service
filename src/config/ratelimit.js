module.exports = (redis) => ({
    global           : true, //  indicates if the plugin should apply the rate limit setting to all routes within the encapsulation scope
    max              : parseInt(process.env.RATE_MAX_REQUESTS) || 4, // How many times to return 429
    timeWindow       : parseInt(process.env.RATE_TIME_WINDOW) || 10 * 1000, // Time window, milliseconds
    ban              : parseInt(process.env.RATE_BAN_REQUESTS) || 2, // Return to 403 after how many 429
    cache            : parseInt(process.env.RATE_LRU_SIZE) || 5000, // default 5000
    allowList        : (req) => req.headers['x-auth-service-secret'] === process.env.TRIGGER_SECRET, // Return true to exempt
    redis,
    continueExceeding: false, // whether to continue counting
    skipOnError      : true, // If the storage crashed whether to let the user pass
    keyGenerator     : (req) => req.headers['x-real-ip'] // nginx
      || req.headers['x-client-ip'] // apache
      || req.headers['x-forwarded-for'] // use this only if you trust the header
      || req.session.username // you can limit based on any session value
      || req.ip // fallback to default
    ,
    enableDraftSpec: false, // default false. Uses IEFT draft header standard
  }
)
