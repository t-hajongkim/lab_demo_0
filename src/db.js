const mysql = require('mysql2/promise');
const config = require('./config');

// 요청마다 커넥션을 새로 열면 금방 한계에 부딪히므로 풀을 사용합니다.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  // DECIMAL 을 JS number 로 바꾸면 금액에서 정밀도가 깨지므로 문자열로 받습니다.
  decimalNumbers: false,
  timezone: 'Z',
});

module.exports = { pool };
