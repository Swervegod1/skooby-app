import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 3101;
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const timeout = setTimeout(() => { server.kill(); console.error('Smoke test timed out.'); process.exitCode = 1; }, 45000);
try {
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('exit', code => reject(new Error('Preview exited before ready: ' + code)));
    server.stdout.on('data', data => { if (String(data).includes('Ready')) resolve(); });
    server.stderr.on('data', data => process.stderr.write(data));
  });
  for (const [path, expected, marker] of [
    ['/', 200, 'A wallet address.'],
    ['/tracker?demo=1', 200, 'fictional'],
    ['/privacy', 200, 'privacy'],
    ['/shared-links', 200, 'noindex'],
    ['/case/not-a-valid-id', 404, 'unavailable'],
    ['/case/not-a-valid-id/image', 404, 'Case unavailable'],
  ]) {
    const res = await fetch(base + path); const body = await res.text();
    assert.equal(res.status, expected, path);
    assert.ok(body.toLowerCase().includes(marker.toLowerCase()), path + ' content');
    console.log('PASS GET ' + path + ' ' + res.status);
  }
  const image = await fetch(base + '/opengraph-image');
  assert.equal(image.status, 200);
  assert.ok(image.headers.get('content-type').includes('image/png'));
  const bytes = Buffer.from(await image.arrayBuffer());
  assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 630);
  console.log('PASS social preview PNG 1200x630');
  for (const [path, body, expected] of [
    ['/api/tracker/analyze', '{', 400],
    ['/api/tracker/analyze', JSON.stringify({ chain: 'solana', address: 'test' }), 400],
    ['/api/reports', JSON.stringify({ chain: 'ethereum', address: '0x' + 'a'.repeat(40) }), 400],
    ['/api/reports', JSON.stringify({ chain: 'ethereum', address: '0x' + 'a'.repeat(40), consent: true }), 503],
    ['/api/events', JSON.stringify({ event: 'arbitrary' }), 400],
  ]) {
    const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(res.status, expected, path); console.log('PASS POST ' + path + ' ' + res.status);
  }
  const cross = await fetch(base + '/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://another.example' }, body: '{}' });
  assert.equal(cross.status, 403); console.log('PASS cross-origin guard 403');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { clearTimeout(timeout); server.kill(); }
