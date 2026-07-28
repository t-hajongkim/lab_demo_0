// GHAS Lab 0 테스트 픽스처 — 의도적으로 취약한 코드입니다.
// 머지 보호 룰셋(medium 통과) 검증 목적이며 app.js 에 마운트되지 않습니다.
// 실제 서비스에서 절대 사용하지 마세요.

const express = require('express');

const router = express.Router();

// [MEDIUM] js/server-side-unvalidated-url-redirection — CWE-601
router.get('/sso-return', (req, res) => {
  res.redirect(req.query.returnUrl);
});

module.exports = router;
