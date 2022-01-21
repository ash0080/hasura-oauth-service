const fs = require('fs')
const path = require('path')
const https = () => ({
  allowHTTP1: true, // fallback support for HTTP1
  key       : fs.readFileSync(process.env.HTTPS_KEY),
  cert      : fs.readFileSync(process.env.HTTPS_CERT),
})

module.exports = process.env.HTTPS_KEY && process.env.HTTPS_CERT ? https() : false
