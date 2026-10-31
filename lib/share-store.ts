import { randomBytes } from 'node:crypto';
import { redis } from './cloud-store';
import { canRevoke, hashRevocationToken, SHARE_TTL_SECONDS, validShareId } from './share-security';
import type { WalletAnalysis } from './wallet-analysis';
export type SharedReport = { id: string; analysis: WalletAnalysis; createdAt: string; expiresAt: string };
type StoredReport = SharedReport & { revokeHash: string };
const key = (id: string) => 'skooby:shared:v1:' + id;
export async function createSharedReport(analysis: WalletAnalysis) {
  const id = randomBytes(16).toString('hex');
  const revokeToken = randomBytes(32).toString('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SHARE_TTL_SECONDS * 1000).toISOString();
  const report: StoredReport = { id, analysis, createdAt, expiresAt, revokeHash: hashRevocationToken(revokeToken) };
  const saved = await redis<string | null>(['SET', key(id), JSON.stringify(report), 'EX', SHARE_TTL_SECONDS, 'NX']);
  if (saved !== 'OK') throw new Error('The share link could not be saved. Try again.');
  return { id, revokeToken, expiresAt };
}
async function readStored(id: string): Promise<StoredReport | null> {
  if (!validShareId(id)) return null;
  const value = await redis<string | null>(['GET', key(id)]);
  if (!value) return null;
  const report = JSON.parse(value) as StoredReport;
  if (!Number.isFinite(Date.parse(report.expiresAt)) || Date.parse(report.expiresAt) <= Date.now() || report.analysis?.version !== 1) return null;
  return report;
}
export async function readSharedReport(id: string): Promise<SharedReport | null> {
  const report = await readStored(id);
  if (!report) return null;
  return { id: report.id, analysis: report.analysis, createdAt: report.createdAt, expiresAt: report.expiresAt };
}
export async function revokeSharedReport(id: string, token: unknown): Promise<boolean> {
  const report = await readStored(id);
  if (!report || !canRevoke(token, report.revokeHash)) return false;
  await redis(['DEL', key(id)]);
  return true;
}
