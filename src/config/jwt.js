const fs = require('fs')
const path = require('path')
module.exports = {
  secret: {
    private: fs.readFileSync(path.join(__dirname, './key/private.key'), 'utf8'),
    public : fs.readFileSync(path.join(__dirname, './key/public.key'), 'utf8'),
  },
  sign  : {
    algorithm: 'RS256',
    expiresIn: '7d',
    iss      : process.env.JWT_ISS,
  },
  decode: {complete: false},
  verify: {allowedIss: process.env.JWT_ISS},
}
