import test from 'node:test';
import assert from 'node:assert/strict';
import { oracleRequestBody } from '../../lib/oracle-types';

test('browser cannot pass risk overrides, live modes, user identity or credentials', () => {
  assert.deepEqual(oracleRequestBody('analyze', {
    product: 'BTC-USD', horizon: 4, live: true, approved: true,
    user_id: 'other-user', risk_override: true, token: 'injected',
  }), { product: 'BTC-USD', horizon: 4 });
});
test('unsupported assets, horizons, routes and malformed payloads are rejected', () => {
  for (const [path, value] of [
    ['analyze', { product: 'NEWCOIN-USD', horizon: 4 }],
    ['analyze', { product: 'BTC-USD', horizon: 720 }],
    ['live/order', { approved: true }], ['pause', { paused: 'false' }],
    ['command', { text: 'x'.repeat(301) }], ['command', { text: ' ' }],
    ['pause', null], ['pause', []],
  ] as const) assert.throws(() => oracleRequestBody(path, value));
});
test('paper orders carry only the decision reference and stable idempotency key', () => {
  const input = { decision_id: 'decision-1', idempotency_key: 'request-1234', notional: 99999, price: 1 };
  assert.deepEqual(oracleRequestBody('paper/order', input), { decision_id: 'decision-1', idempotency_key: 'request-1234' });
  assert.throws(() => oracleRequestBody('paper/order', { decision_id: '../live', idempotency_key: 'request-1234' }));
});
test('natural language remains bounded data and pause requires a literal boolean', () => {
  assert.deepEqual(oracleRequestBody('command', { text: '  Pause all trading.  ', execute: true }), { text: 'Pause all trading.' });
  assert.deepEqual(oracleRequestBody('pause', { paused: false, user: 'other' }), { paused: false });
});
