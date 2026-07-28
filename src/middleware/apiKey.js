const crypto = require('crypto');
const config = require('../config');

const expected = Buffer.from(config.apiKey, 'utf8');

// 길이가 다르면 timingSafeEqual 이 예외를 던지므로 해시로 길이를 맞춰 비교합니다.
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

function requireApiKey(req, res, next) {
  const provided = req.get('x-api-key');
  if (!provided) {
    return res.status(401).json({ error: 'unauthorized', message: 'x-api-key 헤더가 필요합니다.' });
  }

  const match = crypto.timingSafeEqual(sha256(Buffer.from(provided, 'utf8')), sha256(expected));
  if (!match) {
    return res.status(401).json({ error: 'unauthorized', message: 'API 키가 올바르지 않습니다.' });
  }

  return next();
}

module.exports = { requireApiKey };
