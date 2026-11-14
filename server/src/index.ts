import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePost } from './services/analyzer.js';
import {
  getAnalysisLogs,
  getAggregateStats,
  generateCsvExport,
  clearLogs,
  setLabel
} from './storage.js';
import { ExtractedPost } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.includes('.')) {
      console.log(`[Threadibility API] ${req.method} ${req.url} - ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// ==========================================
// 1. Endpoint utama ekstensi Chrome dan konsol pengujian
// ==========================================
app.post('/api/analyze', async (req, res) => {
  try {
    const post: ExtractedPost = req.body;

    if (!post || !post.text || !post.text.trim()) {
      return res.status(400).json({
        error: 'Teks postingan Threads tidak boleh kosong.'
      });
    }

    console.log(`[Threadibility API] Menganalisis post dari ${post.username || 'unknown'} ("${post.text.slice(0, 50)}...")`);

    const { analysis, latencyMs } = await analyzePost(post);

    console.log(`[Threadibility API] Selesai dalam ${latencyMs}ms -> Terindikasi hoax: ${analysis.indikasiHoax}`);

    // Skema AnalysisResult yang diharapkan ekstensi Chrome
    return res.json(analysis);
  } catch (error: any) {
    console.error('[Threadibility API] Error saat analisis post:', error.message);
    return res.status(502).json({
      error: `Penelusuran gagal: ${error.message}`
    });
  }
});

// ==========================================
// 2. Riwayat, statistik, dan ekspor data skripsi
// ==========================================
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  return res.json(getAnalysisLogs(limit));
});

app.get('/api/stats', (_req, res) => {
  return res.json(getAggregateStats());
});

app.patch('/api/history/:id/label', (req, res) => {
  const label = req.body?.label;
  if (label !== 'HOAX' && label !== 'BUKAN_HOAX' && label !== null) {
    return res.status(400).json({ error: 'Label harus HOAX, BUKAN_HOAX, atau null.' });
  }
  if (!setLabel(req.params.id, label)) {
    return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
  }
  return res.json({ success: true });
});

app.delete('/api/history', (_req, res) => {
  clearLogs();
  return res.json({ success: true, message: 'Riwayat data berhasil dibersihkan.' });
});

app.get('/api/export', (_req, res) => {
  const csv = generateCsvExport();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="threadibility_experiments_${Date.now()}.csv"`);
  return res.send(csv);
});

// Halaman lain menampilkan konsol pengujian
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(`THREADIBILITY BACKEND DAN KONSOL PENGUJIAN BERJALAN`);
  console.log(`URL API Server : http://localhost:${PORT}`);
  console.log(`Konsol pengujian: http://localhost:${PORT}`);
  console.log(`Endpoint cek    : http://localhost:${PORT}/api/analyze`);
  console.log(`============================================================\n`);
});
