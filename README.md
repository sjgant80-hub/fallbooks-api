# @ai-native-solutions/fallbooks-api

HTTP API for the **fallbooks** UK accountancy engine. Express + Docker.

Deterministic 2025-26 tax-year computation. No database, no auth, no analytics — pure functions wrapped as endpoints. Bring your own auth layer for production.

> Practitioner aid. Submissions to HMRC / Companies House remain the practitioner's responsibility.

## Run

### Docker (recommended)
```bash
docker compose up -d
curl http://localhost:3000/health
```

### Node
```bash
npm install
npm start
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/rules` | 2025-26 rate table |
| GET | `/chart-of-accounts` | UK generic Chart of Accounts |
| GET | `/vat-flat-rate-sectors` | 50+ FRS sector percentages |
| POST | `/tax/income` | Income tax + employee NI |
| POST | `/tax/ni` | Employee / employer / self-employed NI |
| POST | `/tax/dividend` | Dividend tax with bands |
| POST | `/tax/cgt` | Capital gains tax |
| POST | `/tax/hicbc` | High-income child benefit charge |
| POST | `/tax/sa` | SA100 summary |
| POST | `/tax/ct` | CT600 with marginal relief |
| POST | `/tax/rd` | R&D relief (merged RDEC or ERIS) |
| POST | `/vat/compute` | VAT100 (9 boxes) |
| POST | `/vat/mtd` | MTD-shaped payload from VAT return |
| POST | `/payroll/period` | RTI-shaped FPS/EPS payroll run |
| POST | `/payroll/p60` | P60 from prior payroll runs |
| POST | `/deadlines/generate` | All UK deadlines for a client |
| POST | `/companies-house/penalty` | Late-filing penalty (private Ltd) |
| POST | `/bookkeeping/classify` | Auto-classify transaction description |
| POST | `/kb/ask` | T0 knowledge base (14 rules) |

## Curl examples

```bash
# Health
curl http://localhost:3000/health

# Income tax on £60,000
curl -X POST http://localhost:3000/tax/income \
  -H 'Content-Type: application/json' \
  -d '{"income": 60000}'

# Corporation tax on £120,000 profit
curl -X POST http://localhost:3000/tax/ct \
  -H 'Content-Type: application/json' \
  -d '{"taxableProfit": 120000, "periodMonths": 12}'

# R&D merged RDEC on £100,000 spend
curl -X POST http://localhost:3000/tax/rd \
  -H 'Content-Type: application/json' \
  -d '{"qualifyingExpenditure": 100000}'

# VAT return
curl -X POST http://localhost:3000/vat/compute \
  -H 'Content-Type: application/json' \
  -d '{
    "vatScheme": "standard",
    "periodStart": "2025-04-01",
    "periodEnd": "2026-03-31",
    "transactions": [
      {"date":"2025-05-01","accountCode":"4000","amount":1200},
      {"date":"2025-05-15","accountCode":"6301","amount":120}
    ]
  }'

# Deadline schedule for a Ltd
curl -X POST http://localhost:3000/deadlines/generate \
  -H 'Content-Type: application/json' \
  -d '{"client": {
    "id":"c1","entityType":"limited-company",
    "accountingPeriodStart":"2025-04-01","accountingPeriodEnd":"2026-03-31",
    "vatScheme":"standard","vatNumber":"GB123456789",
    "servicesEngaged":["payroll"],"payeReference":"123/AB"
  }}'

# Ask the T0 knowledge base
curl -X POST http://localhost:3000/kb/ask \
  -H 'Content-Type: application/json' \
  -d '{"query": "When is SA100 due?"}'

# Companies House late-filing penalty
curl -X POST http://localhost:3000/companies-house/penalty \
  -H 'Content-Type: application/json' \
  -d '{"daysLate": 60}'
```

## Environment

- `PORT` (default `3000`)
- `CORS_ORIGIN` (default `*`)

## Companion trio

- `@ai-native-solutions/fallbooks-sdk` — pure JS engine
- `@ai-native-solutions/fallbooks-mcp` — MCP server (stdio)
- `@ai-native-solutions/fallbooks-api` — this package

## Licence

MIT · AI-Native Solutions
