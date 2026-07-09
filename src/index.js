// fallbooks-api — HTTP wrapper for the fallbooks UK accountancy engine
// Express · Docker-ready · MIT · AI-Native Solutions

import express from 'express';
import fb from '@ai-native-solutions/fallbooks-sdk';

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS (permissive by default — restrict via env for production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

// ── meta ──
app.get('/', (req, res) => res.json({
  service: 'fallbooks-api',
  version: fb.VERSION,
  taxYear: fb.TAX_YEAR,
  endpoints: [
    'GET  /health',
    'GET  /rules',
    'GET  /chart-of-accounts',
    'GET  /vat-flat-rate-sectors',
    'POST /tax/income',
    'POST /tax/ni',
    'POST /tax/dividend',
    'POST /tax/cgt',
    'POST /tax/hicbc',
    'POST /tax/sa',
    'POST /tax/ct',
    'POST /tax/rd',
    'POST /vat/compute',
    'POST /vat/mtd',
    'POST /payroll/period',
    'POST /payroll/p60',
    'POST /deadlines/generate',
    'POST /companies-house/penalty',
    'POST /bookkeeping/classify',
    'POST /kb/ask'
  ]
}));

app.get('/health', (req, res) => res.json({ ok: true, version: fb.VERSION, taxYear: fb.TAX_YEAR }));
app.get('/rules', (req, res) => res.json(fb.RULES));
app.get('/chart-of-accounts', (req, res) => res.json(fb.CHART_OF_ACCOUNTS));
app.get('/vat-flat-rate-sectors', (req, res) => res.json(fb.VAT_FLAT_RATE));

// ── tax engine ──
app.post('/tax/income', wrap(async (req) => {
  const inc = +req.body.income || 0;
  return { incomeTax: fb.incomeTax(inc), employeeNI: fb.nationalInsuranceEmployee(inc) };
}));

app.post('/tax/ni', wrap(async (req) => ({
  employee: fb.nationalInsuranceEmployee(+req.body.income || 0),
  employer: fb.nationalInsuranceEmployer(+req.body.grossPay || 0),
  selfEmployed: fb.nationalInsuranceSelfEmployed(+req.body.profit || 0)
})));

app.post('/tax/dividend', wrap(async (req) =>
  fb.dividendTax(+req.body.dividend || 0, +req.body.salaryIncome || 0)
));

app.post('/tax/cgt', wrap(async (req) =>
  fb.capitalGainsTax(+req.body.realisedGain || 0, +req.body.salaryIncome || 0)
));

app.post('/tax/hicbc', wrap(async (req) => ({
  charge: fb.hicbc(+req.body.highestIndividualIncome || 0, +req.body.childBenefitReceived || 0)
})));

app.post('/tax/sa', wrap(async (req) =>
  fb.computeSA(req.body.soleTraderIncome || req.body, req.body.opts || {})
));

app.post('/tax/ct', wrap(async (req) =>
  fb.computeCT(+req.body.taxableProfit || 0, { periodMonths: +req.body.periodMonths || 12 })
));

app.post('/tax/rd', wrap(async (req) =>
  fb.computeRD(+req.body.qualifyingExpenditure || 0, { intensiveLoss: !!req.body.intensiveLoss })
));

// ── VAT ──
app.post('/vat/compute', wrap(async (req) => {
  const client = {
    id: req.body.clientId || 'api-request',
    vatScheme: req.body.vatScheme || 'standard',
    vatFlatRateSector: req.body.vatFlatRateSector
  };
  return fb.computeVAT(req.body.transactions || [], client, req.body.periodStart, req.body.periodEnd);
}));

app.post('/vat/mtd', wrap(async (req) =>
  fb.vatReturnMTD(req.body.vatReturn, req.body.vatNumber || '')
));

// ── Payroll ──
app.post('/payroll/period', wrap(async (req) =>
  fb.computePayrollPeriod(req.body.client || {}, req.body.periodStart, req.body.periodEnd, req.body.opts || {})
));

app.post('/payroll/p60', wrap(async (req) =>
  fb.generateP60(req.body.client || {}, req.body.employeeId, req.body.taxYear, req.body.payrollRuns || [])
));

// ── Deadlines ──
app.post('/deadlines/generate', wrap(async (req) => {
  const dls = fb.generateDeadlinesForClient(req.body.client || {});
  return { count: dls.length, deadlines: dls.map(d => ({ ...d, status: fb.deadlineStatus(d) })) };
}));

// ── Companies House ──
app.post('/companies-house/penalty', wrap(async (req) => ({
  daysLate: +req.body.daysLate || 0,
  penalty: fb.companiesHousePenalty(+req.body.daysLate || 0),
  currency: 'GBP'
})));

// ── Bookkeeping ──
app.post('/bookkeeping/classify', wrap(async (req) => {
  const code = fb.autoClassify(req.body.description || '');
  return { code, account: fb.findAccount(code) };
}));

// ── T0 knowledge ──
app.post('/kb/ask', wrap(async (req) => fb.answerT0(req.body.query || '')));

const PORT = +process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('fallbooks-api v' + fb.VERSION + ' · listening on :' + PORT + ' · tax year ' + fb.TAX_YEAR);
});
