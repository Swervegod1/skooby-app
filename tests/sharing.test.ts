import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { readJson, requireSameOrigin } from '../lib/request-guards';
import { canRevoke, hashRevocationToken, SHARE_TTL_SECONDS, validShareId } from '../lib/share-security';
import { createSharedReport, readSharedReport, revokeSharedReport } from '../lib/share-store';
import { demoCase } from '../lib/demo-case';
import { rateLimit } from '../lib/rate-limit';
import { isGrowthEvent, recordEvent } from '../lib/growth-events';
import { analyzeWallet } from '../lib/wallet-provider';

function env(t: TestContext, name: string, value: string) {
  const previous = process.env[name];
  process.env[name] = value;
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
}

test('JSON guards bound the actual request stream and reject malformed/non-JSON bodies', async () => {
  const request = (body: string, contentType = 'application/json') => new Request('https://skooby.app/api/reports', { method: 'POST', body, headers: { 'Content-Type': contentType } });
  assert.deepEqual(await readJson(request('{"consent":true}')), { consent: true });
  await assert.rejects(readJson(request('{')), { status: 400 });
  await assert.rejects(readJson(request('{}', 'text/plain')), { status: 415 });
  await assert.rejects(readJson(request('x'.repeat(2049))), { status: 413 });
});

test('Cross-origin publication and revocation are rejected', () => {
  assert.doesNotThrow(() => requireSameOrigin(new Request('https://skooby.app/api/reports', { headers: { origin: 'https://skooby.app' } })));
  assert.throws(() => requireSameOrigin(new Request('https://skooby.app/api/reports', { headers: { origin: 'https://another.example' } })), { status: 403 });
  assert.throws(() => requireSameOrigin(new Request('https://skooby.app/api/reports', { headers: { 'sec-fetch-site': 'cross-site' } })), { status: 403 });
});

test('Revocation requires a separate strong token and well-formed report ID', () => {
  const token = 'e'.repeat(64);
  assert.equal(canRevoke(token, hashRevocationToken(token)), true);
  assert.equal(canRevoke('f'.repeat(64), hashRevocationToken(token)), false);
  assert.equal(canRevoke(undefined, hashRevocationToken(token)), false);
  assert.equal(canRevoke(token, 'bad hash'), false);
  assert.equal(validShareId('../private'), false);
  assert.equal(validShareId('a'.repeat(32)), true);
  assert.equal(SHARE_TTL_SECONDS, 604800);
});

test('Reports persist with TTL, never disclose removal credentials, and disappear after revocation or expiry', async t => {
  env(t, 'UPSTASH_REDIS_REST_URL', 'https://store.example');
  env(t, 'UPSTASH_REDIS_REST_TOKEN', 'test-only');
  const rows = new Map<string, string>();
  const commands: Array<Array<string | number>> = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const command = JSON.parse(String(init.body)) as Array<string | number>;
    commands.push(command);
    let result: unknown = null;
    const key = String(command[1]);
    if (command[0] === 'SET') { rows.set(key, String(command[2])); result = 'OK'; }
    if (command[0] === 'GET') result = rows.get(key) ?? null;
    if (command[0] === 'DEL') result = Number(rows.delete(key));
    return Response.json({ result });
  });
  const share = await createSharedReport(demoCase());
  assert.equal(share.id.length, 32);
  assert.equal(share.revokeToken.length, 64);
  assert.deepEqual(commands[0].slice(3), ['EX', 604800, 'NX']);
  const report = await readSharedReport(share.id);
  assert.ok(report);
  assert.equal('revokeHash' in report, false);
  assert.equal(JSON.stringify(report).includes(share.revokeToken), false);
  assert.equal(await revokeSharedReport(share.id, 'f'.repeat(64)), false);
  assert.ok(await readSharedReport(share.id));
  assert.equal(await revokeSharedReport(share.id, share.revokeToken), true);
  assert.equal(await readSharedReport(share.id), null);
  assert.equal(await readSharedReport('../private'), null);
  const second = await createSharedReport(demoCase());
  const key = 'skooby:shared:v1:' + second.id;
  const expired = JSON.parse(rows.get(key)!); expired.expiresAt = '2000-01-01T00:00:00.000Z'; rows.set(key, JSON.stringify(expired));
  assert.equal(await readSharedReport(second.id), null);
});

test('Share creation fails closed when persistence does not acknowledge the write', async t => {
  env(t, 'UPSTASH_REDIS_REST_URL', 'https://store.example');
  env(t, 'UPSTASH_REDIS_REST_TOKEN', 'test-only');
  t.mock.method(globalThis, 'fetch', async () => Response.json({ result: null }));
  await assert.rejects(createSharedReport(demoCase()), /could not be saved/);
});

test('Local rate limits work and durable sharing fails closed without Redis', async t => {
  env(t, 'UPSTASH_REDIS_REST_URL', '');
  env(t, 'UPSTASH_REDIS_REST_TOKEN', '');
  const request = new Request('https://skooby.app/api/reports');
  await rateLimit(request, 'test-once', 1);
  await assert.rejects(rateLimit(request, 'test-once', 1), { status: 429 });
  await assert.rejects(rateLimit(request, 'test-durable', 1, 60, true), { status: 503 });
});

test('Growth counters accept a bounded vocabulary and store no address or visitor identifiers', async t => {
  env(t, 'UPSTASH_REDIS_REST_URL', 'https://store.example');
  env(t, 'UPSTASH_REDIS_REST_TOKEN', 'test-only');
  let command: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => { command = JSON.parse(String(init.body)); return Response.json({ result: 1 }); });
  assert.equal(isGrowthEvent('share_created'), true);
  assert.equal(isGrowthEvent('wallet:0xsecret'), false);
  await recordEvent('share_created');
  assert.equal(command.length, 5);
  assert.match(command[3], /^skooby:growth:v1:\d{4}-\d{2}-\d{2}$/);
  assert.equal(command[4], 'share_created');
});

test('Provider failures and oversized responses never produce invented data', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 429 }));
  const wallet = { chain: 'ethereum', address: '0x' + 'a'.repeat(40) };
  await assert.rejects(analyzeWallet(wallet), /busy/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response('x'.repeat(2000001)));
  await assert.rejects(analyzeWallet(wallet), /too much data/);
});
