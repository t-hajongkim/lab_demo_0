# 잔고 조회 API (프로토타입)

자산운용사 고객의 계좌 잔고를 계좌번호로 조회하는 Express + MySQL API입니다.

## 실행

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
# .env 에 DB 접속정보와 API_KEY 를 채웁니다.
mysql -u root -p < schema.sql # 프로토타입용 스키마 + 샘플 데이터
npm start
```

API 키 생성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 엔드포인트

### `GET /health`

DB 연결 확인용. 인증 불필요.

### `GET /api/accounts/:accountNumber/balance`

헤더 `x-api-key` 필수.

```bash
curl -H "x-api-key: $API_KEY" \
  http://localhost:3000/api/accounts/110-234-567890/balance
```

```json
{
  "accountNumber": "110-234-567890",
  "customerName": "김하준",
  "currency": "KRW",
  "balance": "15250000.00",
  "status": "ACTIVE",
  "asOf": "2026-07-28T03:00:00.000Z"
}
```

`balance` 는 부동소수점 오차를 피하려고 문자열로 내려갑니다. 클라이언트에서 `Number()` 로 바꾸지 말고 Decimal 계열 라이브러리로 다루세요.

| 상태 | 의미 |
| --- | --- |
| 400 | 계좌번호 형식 오류 |
| 401 | `x-api-key` 누락 또는 불일치 |
| 404 | 계좌 없음 |
| 500 | 서버 오류 |

## 설계 메모

- 계좌번호는 SQL 문자열에 붙이지 않고 `pool.execute()` 의 바인딩 파라미터로만 전달합니다 (SQL 인젝션 방지).
- 금액 컬럼은 `DECIMAL(18,2)`, 드라이버 옵션 `decimalNumbers: false` 로 문자열 유지.
- 커넥션 풀 사용, `SIGINT`/`SIGTERM` 에서 정상 종료.
- 에러 응답에 내부 예외 메시지를 노출하지 않습니다.

## 운영 전환 전 남은 일

프로토타입 범위라 아래는 의도적으로 빠져 있습니다. 실제 고객 데이터에 붙이기 전에 반드시 처리해야 합니다.

- **인가(authorization)**: 지금은 API 키 하나만 맞으면 *모든* 계좌를 조회할 수 있습니다. 요청자가 해당 계좌의 소유자/권한자인지 확인하는 로직이 필요합니다.
- **감사 로그**: 금융 계좌 조회는 누가·언제·어떤 계좌를 봤는지 기록이 필요합니다.
- **전송 구간 암호화**: HTTPS 종단(리버스 프록시 또는 앱 레벨 TLS) 필수.
- **레이트 리밋**: 계좌번호 대입 조회를 막기 위한 요청 제한.
- **DB 계정 권한 축소**: `accounts`, `customers` 에 대한 `SELECT` 권한만 가진 읽기 전용 계정 사용.
- **시크릿 관리**: `.env` 대신 시크릿 매니저(Vault, AWS Secrets Manager 등).
- **테스트**: 라우트/검증/인증 단위 테스트.
