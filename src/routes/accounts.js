const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// 계좌번호 형식: 숫자와 하이픈만, 10~30자
const ACCOUNT_NUMBER_PATTERN = /^[0-9-]{10,30}$/;

router.get('/:accountNumber/balance', async (req, res, next) => {
  const { accountNumber } = req.params;

  if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    return res.status(400).json({
      error: 'invalid_account_number',
      message: '계좌번호는 숫자와 하이픈으로 이루어진 10~30자여야 합니다.',
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT a.account_number,
              a.currency,
              a.balance,
              a.status,
              a.updated_at,
              c.name AS customer_name
         FROM accounts a
         JOIN customers c ON c.id = a.customer_id
        WHERE a.account_number = ?
        LIMIT 1`,
      [accountNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'account_not_found',
        message: '해당 계좌를 찾을 수 없습니다.',
      });
    }

    const row = rows[0];
    return res.json({
      accountNumber: row.account_number,
      customerName: row.customer_name,
      currency: row.currency,
      // DECIMAL 을 문자열 그대로 내려 정밀도 손실을 막습니다.
      balance: row.balance,
      status: row.status,
      asOf: row.updated_at,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
