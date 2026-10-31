import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBitcoinData, analyzeEthereumData, atomic, explorerUrl, formatAtomic, parseExactJson, parseWalletInput, type BitcoinTransaction } from '../lib/wallet-analysis';
import { demoCase } from '../lib/demo-case';
const focus = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const other = '1BitcoinEaterAddressDontSendf59kuE';
const recipient = '1CounterpartyXXXXXXXXXXXXXXXUWLpVr';
const eth = '0x' + 'a'.repeat(40);
const ethOther = 'b'.repeat(40);
const date = '2026-10-31T12:00:00.000Z';
const summary = { chain_stats: { funded_txo_sum: 150000000, spent_txo_sum: 100000000, tx_count: 3 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 } };
const transaction: BitcoinTransaction = {
  txid: 'a'.repeat(64),
  vin: [{ prevout: { scriptpubkey_address: focus, value: 100000000 } }, { prevout: { scriptpubkey_address: other, value: 200000000 } }],
  vout: [{ scriptpubkey_address: recipient, value: 250000000 }, { scriptpubkey_address: focus, value: 49990000 }],
  status: { confirmed: true, block_time: 1793448000 },
};

test('Bitcoin multi-input graph preserves transaction boundaries and address net change', () => {
  const report = analyzeBitcoinData(focus, summary, [transaction], date);
  assert.equal(report.transactions[0].netAtomic, '-50010000');
  assert.equal(report.balance, '0.5');
  assert.equal(report.edges.length, 4);
  assert.ok(report.edges.every(edge => edge.from.startsWith('tx:') !== edge.to.startsWith('tx:')));
  assert.equal(report.edges.find(edge => edge.from === focus)?.valueAtomic, '100000000');
  assert.equal(report.edges.find(edge => edge.to === recipient)?.valueAtomic, '250000000');
  assert.equal(report.coverage.truncated, true);
});

test('Bitcoin change outputs are grouped and duplicate transactions are not double-counted', () => {
  const tx = { ...transaction, vout: [...transaction.vout, { scriptpubkey_address: focus, value: 10 }] };
  const report = analyzeBitcoinData(focus, summary, [tx, tx], date);
  assert.equal(report.transactions.length, 1);
  assert.equal(report.transactions[0].receivedAtomic, '49990010');
  assert.equal(report.edges.filter(edge => edge.to === focus).length, 1);
});

test('Coinbase and pending receipts are handled without inventing a sender', () => {
  const tx = { ...transaction, vin: [{ is_coinbase: true }], vout: [{ scriptpubkey_address: focus, value: 5000000000 }], status: { confirmed: false } };
  const report = analyzeBitcoinData(focus, summary, [tx], date);
  assert.equal(report.transactions[0].spentAtomic, '0');
  assert.equal(report.transactions[0].confirmed, false);
  assert.equal(report.edges.length, 1);
});

test('Large histories and high fan-out transactions stay bounded and disclose truncation', () => {
  const txs = Array.from({ length: 25 }, (_, i) => ({ ...transaction, txid: i.toString(16).padStart(64, '0') }));
  const report = analyzeBitcoinData(focus, summary, txs, date);
  assert.equal(report.transactions.length, 14);
  assert.equal(report.coverage.graphTransactions, 6);
  assert.equal(report.coverage.truncated, true);
  const crowded = analyzeBitcoinData(focus, summary, [{ ...transaction, vout: Array.from({ length: 100 }, (_, i) => ({ scriptpubkey_address: 'test-address-' + i, value: 1 })) }], date);
  assert.ok(crowded.nodes.length <= 42);
  assert.ok(crowded.edges.length <= 72);
  assert.equal(crowded.coverage.truncated, true);
});

test('Incomplete transactions fail instead of becoming false zero balances', () => {
  assert.throws(() => analyzeBitcoinData(focus, summary, [{ ...transaction, vin: [{}] }], date), /incomplete/);
  assert.throws(() => analyzeEthereumData(eth, { final_balance: '0', final_n_tx: 1 }, date), /incomplete/);
  assert.throws(() => atomic(Number.MAX_SAFE_INTEGER + 1), /imprecise/);
  assert.throws(() => atomic(-1));
});

test('Exact JSON parsing preserves wei, escaped strings, and ordinary JSON values', () => {
  const parsed = parseExactJson('{"wei":1000000000000000001,"n":12,"float":1.5,"exponent":2e3,"s":"1000000000000000001 and \\"quoted\\"","negative":-1000000000000000001}') as Record<string, unknown>;
  assert.equal(parsed.wei, '1000000000000000001');
  assert.equal(parsed.negative, '-1000000000000000001');
  assert.equal(parsed.n, 12);
  assert.equal(parsed.float, 1.5);
  assert.equal(parsed.exponent, 2000);
  assert.equal(parsed.s, '1000000000000000001 and "quoted"');
  assert.equal(formatAtomic('1000000000000000001', 'ethereum'), '1.000000000000000001');
  assert.equal(formatAtomic('-1', 'bitcoin'), '-0.00000001');
});

test('Ethereum amounts stay exact, fee-adjusted, and case normalized', () => {
  const report = analyzeEthereumData(eth.toUpperCase(), { final_balance: '1000000000000000001', final_n_tx: 1, txs: [{ hash: 'c'.repeat(64), fees: '21000000000000', confirmed: date, inputs: [{ addresses: [eth.slice(2).toUpperCase()] }], outputs: [{ addresses: [ethOther], value: '1000000000000000001' }] }] }, date);
  assert.equal(report.address, eth);
  assert.equal(report.balance, '1.000000000000000001');
  assert.equal(report.transactions[0].netAtomic, '-1000021000000000001');
  assert.equal(report.edges[0].valueAtomic, '1000000000000000001');
  assert.equal(explorerUrl('ethereum', 'c'.repeat(64), 'tx'), 'https://etherscan.io/tx/0x' + 'c'.repeat(64));
});

test('Ambiguous Ethereum inputs are excluded rather than attributing full amounts twice', () => {
  const report = analyzeEthereumData(eth, { final_balance: '0', final_n_tx: 1, txs: [{ hash: 'd'.repeat(64), inputs: [{ addresses: [eth, ethOther] }], outputs: [{ addresses: [ethOther], value: '1' }] }] }, date);
  assert.equal(report.transactions.length, 0);
  assert.equal(report.edges.length, 0);
  assert.equal(report.coverage.truncated, true);
});

test('Strict chain/address validation rejects unsupported networks and oversized input', () => {
  assert.equal(parseWalletInput({ chain: 'ethereum', address: '  0x' + 'A'.repeat(40) + ' ' }).address, eth);
  assert.throws(() => parseWalletInput({ chain: 'solana', address: focus }));
  assert.throws(() => parseWalletInput({ chain: 'bitcoin', address: 'x'.repeat(101) }));
  assert.throws(() => parseWalletInput({ chain: 'ethereum', address: focus }));
  assert.throws(() => parseWalletInput(null));
});

test('Demo is clearly fictional, complete, and independent of providers', () => {
  const report = demoCase();
  assert.equal(report.demo, true);
  assert.equal(report.transactions.length, 3);
  assert.match(report.address, /fictional/);
  assert.ok(report.edges.length > 0);
});
