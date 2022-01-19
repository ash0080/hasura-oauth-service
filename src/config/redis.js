module.exports = {
  token      : Object.assign({namespace: 'token', db: 0}, basicConfig),
  rate: Object.assign({
                               namespace           : 'rate',
                               connectTimeout      : 500, // For Rate limiting
                               maxRetriesPerRequest: 1,
                               db                  : 1,
                             }, basicConfig),
}
