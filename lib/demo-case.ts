import { analyzeBitcoinData, type WalletAnalysis } from './wallet-analysis';

const focus = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const inputA = '1BitcoinEaterAddressDontSendf59kuE';
const inputB = '1CounterpartyXXXXXXXXXXXXXXXUWLpVr';

// Fixed synthetic values; these are NOT live records for the displayed addresses.
export function demoCase(): WalletAnalysis {
  const result = analyzeBitcoinData(focus, {
    chain_stats: { funded_txo_sum: 125000000, spent_txo_sum: 30000000, tx_count: 3 },
    mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
  }, [
    { txid: 'a'.repeat(64), vin: [{ prevout: { scriptpubkey_address: focus, value: 30000000 } }], vout: [{ scriptpubkey_address: inputB, value: 29990000 }], status: { confirmed: true, block_time: 1793376000 } },
    { txid: 'b'.repeat(64), vin: [{ prevout: { scriptpubkey_address: inputA, value: 40000000 } }, { prevout: { scriptpubkey_address: inputB, value: 10000000 } }], vout: [{ scriptpubkey_address: focus, value: 45000000 }, { scriptpubkey_address: inputA, value: 4990000 }], status: { confirmed: true, block_time: 1793289600 } },
    { txid: 'c'.repeat(64), vin: [{ prevout: { scriptpubkey_address: inputA, value: 80010000 } }], vout: [{ scriptpubkey_address: focus, value: 80000000 }], status: { confirmed: true, block_time: 1793203200 } },
  ], '2026-10-31T12:00:00.000Z');
  return { ...result, demo: true, address: 'Demo wallet · fictional activity', provider: 'Synthetic demonstration', summary: ['A fictional wallet received 1.25 BTC and spent inputs totaling 0.30 BTC.', 'One transaction combines two inputs. The graph keeps them attached to the transaction, without claiming which input funded a particular output.', 'Explore the map, inspect the evidence and download a sample case card.'], limitations: ['All values and transactions in this demonstration are fictional.', 'Analyze a real public address for a provider-sourced snapshot.'] };
}
