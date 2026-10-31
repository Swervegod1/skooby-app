import { shortAddress, type WalletAnalysis } from './wallet-analysis';

export async function downloadCaseCard(analysis: WalletAnalysis) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable in this browser.');
  const ctx = context;
  ctx.fillStyle = '#101512'; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#27352c'; ctx.lineWidth = 1;
  for (let x = 0; x < 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1350); ctx.stroke(); }
  for (let y = 0; y < 1350; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
  ctx.fillStyle = '#101512'; ctx.fillRect(48, 48, 984, 1254);
  function text(value: string, x: number, y: number, size = 30, color = '#eaf1e9', weight = '400') {
    ctx.font = weight + ' ' + size + 'px Arial, sans-serif'; ctx.fillStyle = color; ctx.fillText(value, x, y);
  }
  function wrap(value: string, y: number, size = 27, maxWidth = 880) {
    ctx.font = '400 ' + size + 'px Arial, sans-serif';
    let line = '';
    for (const word of value.split(' ')) {
      if (ctx.measureText(line + word).width > maxWidth && line) { text(line.trim(), 92, y, size, '#b9c7be'); y += size * 1.45; line = ''; }
      line += word + ' ';
    }
    text(line.trim(), 92, y, size, '#b9c7be');
    return y + size * 1.6;
  }
  text('SKOOBY.', 92, 140, 47, '#c5f773', '800');
  text(analysis.demo ? 'DEMO / FICTIONAL ACTIVITY' : 'PUBLIC-ADDRESS SNAPSHOT', 92, 202, 20, '#c5f773', '700');
  text('Follow the trail.', 92, 314, 67, '#f2f5ed', '800');
  text(analysis.chain === 'bitcoin' ? 'Bitcoin case file' : 'Ethereum case file', 92, 374, 32, '#b9c7be');
  text(shortAddress(analysis.address), 92, 435, 27, '#f2f5ed');
  ctx.fillStyle = '#1d2920'; ctx.fillRect(92, 490, 896, 175);
  text('BALANCE AT CAPTURE', 120, 537, 20, '#b9c7be', '700');
  const balance = analysis.balance + ' ' + analysis.unit;
  text(balance, 120, 610, balance.length > 27 ? 32 : 46, '#c5f773', '700');
  text(String(analysis.coverage.sampledTransactions), 92, 753, 49, '#f2f5ed', '700');
  text('transactions sampled', 92, 799, 23, '#b9c7be');
  text(String(analysis.transactionCount), 575, 753, 49, '#f2f5ed', '700');
  text('reported by provider', 575, 799, 23, '#b9c7be');
  let y = wrap(analysis.summary[2] || analysis.summary[0], 881);
  y = wrap(analysis.demo ? 'Synthetic demonstration. These are not real transactions.' : 'A limited data snapshot. Address relationships do not establish identity or intent.', y + 16, 24);
  text('SOURCE / ' + analysis.provider, 92, Math.max(y + 35, 1070), 22, '#b9c7be');
  text('CAPTURE / ' + new Date(analysis.capturedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC', 92, Math.max(y + 75, 1110), 20, '#b9c7be');
  ctx.fillStyle = '#c5f773'; ctx.fillRect(92, 1170, 896, 76);
  text('Investigate a public address at skooby.app', 124, 1219, 29, '#101512', '700');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed.')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = analysis.demo ? 'skooby-demo-case.png' : 'skooby-' + analysis.chain + '-case.png';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
