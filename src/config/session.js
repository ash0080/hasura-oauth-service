const fs      =require('fs')
const path    =require('path')
module.exports={
  key:    fs.readFileSync(path.join(__dirname, 'key/secret.key')),
  cookie: {
    path:     '/',
    httpOnly: true,
  },
}
