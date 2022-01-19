const hash = require('@ash0080/one-char-hash')

const genFingerPrint = (req) => {
  const collect = [req.ip,
                   req.headers['user-agent'],
                   req.headers['accept-language'],
                   req.headers['sec-ch-ua'],
                   req.headers['sec-ch-ua-mobile'],
                   req.headers['sec-ch-ua-platform'],
  ]
  return collect.reduce((acc, cur) => acc + hash(cur || ''), '')
}

const calcScore = (req, storedfingerPrint) => {
  const fingerPrint = genFingerPrint(req)
  let sum = 0
  for (let i = 0; i < fingerPrint.length; i++) {
    if (fingerPrint[i] === storedfingerPrint[i]) {
      sum++
    }
  }
  return sum / fingerPrint.length
}

const isValidate = (req, storedfingerPrint, threshold) => {
  if (!storedfingerPrint) {
    return false
  }
  return calcScore(req, storedfingerPrint) >= threshold
}

module.exports = {
  isValidate,
  genFingerPrint,
}
