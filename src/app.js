const express = require('express');
const { pool } = require('./db');
const { requireApiKey } = require('./middleware/apiKey');
const accountsRouter = require('./routes/accounts');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

app.use('/api/accounts', requireApiKey, accountsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, _req, res, _next) => {
  // 내부 오류 상세는 서버 로그에만 남기고 클라이언트에는 노출하지 않습니다.
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

module.exports = app;
