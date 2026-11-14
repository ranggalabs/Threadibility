import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalysisLogRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analysis_history.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
    }
  } catch (error) {
    console.error(`[Threadibility Storage] Error reading ${filePath}:`, error);
  }
  return [];
}

function writeJsonFile<T>(filePath: string, data: T[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[Threadibility Storage] Error writing ${filePath}:`, error);
  }
}

let analysisHistory: AnalysisLogRecord[] = readJsonFile<AnalysisLogRecord>(ANALYSIS_FILE);

export function saveAnalysisLog(record: AnalysisLogRecord): void {
  analysisHistory.unshift(record); // terbaru di depan
  if (analysisHistory.length > 500) {
    analysisHistory = analysisHistory.slice(0, 500);
  }
  writeJsonFile(ANALYSIS_FILE, analysisHistory);
}

export function getAnalysisLogs(limit = 50): AnalysisLogRecord[] {
  return analysisHistory.slice(0, limit);
}

export function clearLogs(): void {
  analysisHistory = [];
  writeJsonFile(ANALYSIS_FILE, analysisHistory);
}

export function getAggregateStats() {
  const total = analysisHistory.length;
  const hoax = analysisHistory.filter((r) => r.result.indikasiHoax).length;
  const avgLatencyMs =
    total > 0 ? Math.round(analysisHistory.reduce((sum, r) => sum + r.latencyMs, 0) / total) : 0;

  return {
    total,
    hoax,
    notFlagged: total - hoax,
    avgLatencyMs,
    confusion: getConfusionMatrix()
  };
}

export function setLabel(id: string, label: 'HOAX' | 'BUKAN_HOAX' | null): boolean {
  const rec = analysisHistory.find((r) => r.id === id);
  if (!rec) return false;
  if (label) rec.label = label;
  else delete rec.label;
  writeJsonFile(ANALYSIS_FILE, analysisHistory);
  return true;
}

/**
 * Confusion Matrix (kelas positif = hoaks) dari data yang sudah diberi label sebenarnya.
 * TP: label hoaks, sistem hoaks. FP: label bukan hoaks, sistem hoaks.
 * TN: label bukan hoaks, sistem bukan hoaks. FN: label hoaks, sistem bukan hoaks.
 */
export function getConfusionMatrix() {
  const labeled = analysisHistory.filter((r) => r.label);
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of labeled) {
    const pred = r.result.indikasiHoax;
    const actual = r.label === 'HOAX';
    if (actual && pred) tp++;
    else if (!actual && pred) fp++;
    else if (!actual && !pred) tn++;
    else fn++;
  }
  const n = tp + fp + tn + fn;
  const div = (a: number, b: number) => (b > 0 ? a / b : null);
  const precision = div(tp, tp + fp);
  const recall = div(tp, tp + fn);
  const f1 = precision !== null && recall !== null && precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : null;
  return { n, tp, fp, tn, fn, accuracy: div(tp + tn, n), precision, recall, f1 };
}

/**
 * Ekspor CSV untuk laporan eksperimen skripsi
 */
export function generateCsvExport(): string {
  const headers = [
    'ID',
    'Timestamp',
    'Username',
    'PostText',
    'Claim',
    'Hasil',
    'LabelSebenarnya',
    'LatencyMs',
    'Alasan'
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    const clean = str.replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${clean}"`;
  };

  const rows = analysisHistory.map((r) => [
    r.id,
    r.timestamp,
    escapeCsv(r.post.username),
    escapeCsv(r.post.text),
    escapeCsv(r.result.claim),
    r.result.indikasiHoax ? 'TERINDIKASI_HOAX' : 'TIDAK_TERINDIKASI',
    r.label ?? '',
    r.latencyMs,
    escapeCsv(r.result.alasan)
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
