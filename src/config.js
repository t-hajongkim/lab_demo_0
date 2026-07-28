require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 설정되지 않았습니다. .env.example 을 참고하세요.`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  apiKey: required('API_KEY'),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
};
