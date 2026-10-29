import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalysisLogRecord, ComparisonLogRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analysis_history.json');
const COMPARISON_FILE = path.join(DATA_DIR, 'comparison_history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T[];
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
let comparisonHistory: ComparisonLogRecord[] = readJsonFile<ComparisonLogRecord>(COMPARISON_FILE);

export function saveAnalysisLog(record: AnalysisLogRecord): void {
  analysisHistory.unshift(record); // Prepend to keep latest first
  // Keep last 500 records
  if (analysisHistory.length > 500) {
    analysisHistory = analysisHistory.slice(0, 500);
  }
  writeJsonFile(ANALYSIS_FILE, analysisHistory);
}

export function getAnalysisLogs(limit = 50): AnalysisLogRecord[] {
  return analysisHistory.slice(0, limit);
}

export function saveComparisonLog(record: ComparisonLogRecord): void {
  comparisonHistory.unshift(record);
  if (comparisonHistory.length > 200) {
    comparisonHistory = comparisonHistory.slice(0, 200);
  }
  writeJsonFile(COMPARISON_FILE, comparisonHistory);
}

export function getComparisonLogs(limit = 50): ComparisonLogRecord[] {
  return comparisonHistory.slice(0, limit);
}

export function clearLogs(): void {
  analysisHistory = [];
  comparisonHistory = [];
  writeJsonFile(ANALYSIS_FILE, analysisHistory);
  writeJsonFile(COMPARISON_FILE, comparisonHistory);
}

export function getAggregateStats() {
  const total = analysisHistory.length;
  const hoax = analysisHistory.filter((r) => r.result.indikasiHoax).length;
  const verified = total - hoax;

  // Breakdown by model provider
  const providers = ['openai', 'gemini', 'claude', 'nineRouter'] as const;
  const breakdown: Record<string, { total: number; hoax: number; avgLatencyMs: number; avgConfidence: number }> = {};

  for (const p of providers) {
    const list = analysisHistory.filter((r) => r.provider === p);
    const count = list.length;
    const hCount = list.filter((r) => r.result.indikasiHoax).length;
    const avgLatency = count > 0 ? Math.round(list.reduce((sum, r) => sum + r.latencyMs, 0) / count) : 0;
    const avgConf = count > 0 ? Number((list.reduce((sum, r) => sum + r.result.confidence, 0) / count).toFixed(2)) : 0;

    breakdown[p] = {
      total: count,
      hoax: hCount,
      avgLatencyMs: avgLatency,
      avgConfidence: avgConf
    };
  }

  return {
    total,
    hoax,
    verified,
    breakdown
  };
}

/**
 * Generate CSV export data for thesis experimental report
 */
export function generateCsvExport(): string {
  const headers = [
    'ID',
    'Timestamp',
    'Provider',
    'ModelName',
    'Username',
    'PostText',
    'Claim',
    'IndikasiHoax',
    'Confidence',
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
    r.provider,
    r.modelName,
    escapeCsv(r.post.username),
    escapeCsv(r.post.text),
    escapeCsv(r.result.claim),
    r.result.indikasiHoax ? 'HOAX' : 'VERIFIED',
    r.result.confidence,
    r.latencyMs,
    escapeCsv(r.result.alasan)
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
