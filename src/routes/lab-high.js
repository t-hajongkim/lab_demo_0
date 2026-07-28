// GHAS Lab 0 테스트 픽스처 — 의도적으로 취약한 코드입니다.
// 머지 보호 룰셋(high 차단) 검증 목적이며 app.js 에 마운트되지 않습니다.
// 실제 서비스에서 절대 사용하지 마세요.

const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// [HIGH] js/code-injection — CWE-94
router.post('/calc', (req, res) => {
  const result = eval(req.body.formula);
  res.json({ result });
});

// [HIGH] js/command-line-injection — CWE-78
router.get('/export', (req, res) => {
  exec('python export.py --account ' + req.query.account, (err, out) => {
    res.send(out);
  });
});

module.exports = router;
