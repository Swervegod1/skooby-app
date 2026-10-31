// Run with server-side Redis credentials, e.g. node --env-file=.env.local scripts/growth-report.mjs 2026-10-31
const date = process.argv[2] || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use a YYYY-MM-DD date.');
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) throw new Error('Set the server-side Redis URL and token.');
const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(['HGETALL', 'skooby:growth:v1:' + date]), signal: AbortSignal.timeout(5000) });
if (!response.ok) throw new Error('The metrics store could not be read.');
const body = await response.json();
if (body.error) throw new Error('The metrics query failed.');
const counts = {};
for (let i = 0; i < (body.result || []).length; i += 2) counts[body.result[i]] = Number(body.result[i + 1]);
console.log(JSON.stringify({ date, note: 'Aggregate event counts, not unique visitors or an attributed conversion funnel.', counts }, null, 2));
