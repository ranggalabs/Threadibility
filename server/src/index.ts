import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, saveConfig, getSafeConfig } from './config.js';
import { analyzeActiveModel, compareAllModels } from './services/aiService.js';
import {
  getAnalysisLogs,
  getComparisonLogs,
  getAggregateStats,
  generateCsvExport,
  clearLogs
} from './storage.js';
import { ExtractedPost, ModelProvider } from './types.js';
import { generateMockAnalysis } from './services/mockFallback.js';
import { testNineRouterConnection } from './services/nineRouter.js';

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
// 1. Chrome Extension Primary Endpoint
// ==========================================
app.post('/api/analyze', async (req, res) => {
  try {
    const post: ExtractedPost = req.body;

    if (!post || !post.text || !post.text.trim()) {
      return res.status(400).json({
        error: 'Teks postingan Threads tidak boleh kosong.'
      });
    }

    console.log(`[Threadibility API] Menganalisis post dari @${post.username || 'unknown'} ("${post.text.slice(0, 50)}...")`);

    const { analysis, provider, modelName, latencyMs } = await analyzeActiveModel(post);

    console.log(`[Threadibility API] Sukses via ${provider} (${modelName}) dalam ${latencyMs}ms -> Hoax: ${analysis.indikasiHoax}, Conf: ${analysis.confidence}`);

    // Return exact AnalysisResult schema expected by Chrome Extension
    return res.json(analysis);
  } catch (error: any) {
    console.error('[Threadibility API] Error saat analisis post:', error.message);
    const fallback = generateMockAnalysis(req.body, 'Cadangan');
    fallback.alasan = `[Catatan: Terjadi kendala koneksi API/Router: ${error.message}]. ${fallback.alasan}`;
    return res.json(fallback);
  }
});

// ==========================================
// 2. Multi-Model Comparison / Thesis Benchmark
// ==========================================
app.post('/api/compare', async (req, res) => {
  try {
    const post: ExtractedPost = req.body;

    if (!post || !post.text || !post.text.trim()) {
      return res.status(400).json({
        error: 'Teks postingan tidak boleh kosong untuk perbandingan.'
      });
    }

    console.log(`[Threadibility API] Menjalankan perbandingan 3 Model AI untuk skripsi...`);
    const comparison = await compareAllModels(post);

    return res.json(comparison);
  } catch (error: any) {
    console.error('[Threadibility API] Error perbandingan model:', error.message);
    return res.status(500).json({
      error: error.message || 'Gagal menjalankan perbandingan model AI.'
    });
  }
});

// ==========================================
// 3. Configuration & API Keys Management
// ==========================================
app.get('/api/config', (_req, res) => {
  return res.json(getSafeConfig());
});

app.post('/api/config', (req, res) => {
  try {
    const {
      activeModel,
      openaiApiKey,
      geminiApiKey,
      claudeApiKey,
      openaiModel,
      geminiModel,
      claudeModel,
      temperature
    } = req.body;

    const updates: any = {};

    if (activeModel && ['openai', 'gemini', 'claude', 'nineRouter'].includes(activeModel)) {
      updates.activeModel = activeModel as ModelProvider;
    }

    // Update API keys if explicitly sent
    if (openaiApiKey !== undefined) {
      updates.openaiApiKey = (openaiApiKey || '').trim();
    }
    if (geminiApiKey !== undefined) {
      updates.geminiApiKey = (geminiApiKey || '').trim();
    }
    if (claudeApiKey !== undefined) {
      updates.claudeApiKey = (claudeApiKey || '').trim();
    }
    if (req.body.nineRouterApiKey !== undefined) {
      updates.nineRouterApiKey = (req.body.nineRouterApiKey || '').trim();
    }
    if (req.body.nineRouterBaseUrl !== undefined) {
      updates.nineRouterBaseUrl = (req.body.nineRouterBaseUrl || '').trim();
    }
    if (req.body.nineRouterModel !== undefined) {
      updates.nineRouterModel = (req.body.nineRouterModel || '').trim();
    }

    if (typeof openaiModel === 'string' && openaiModel.trim()) updates.openaiModel = openaiModel.trim();
    if (typeof geminiModel === 'string' && geminiModel.trim()) updates.geminiModel = geminiModel.trim();
    if (typeof claudeModel === 'string' && claudeModel.trim()) updates.claudeModel = claudeModel.trim();
    if (typeof temperature === 'number') updates.temperature = Math.max(0, Math.min(1, temperature));

    saveConfig(updates);

    return res.json({
      success: true,
      message: 'Konfigurasi berhasil disimpan.',
      config: getSafeConfig()
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Gagal menyimpan konfigurasi.'
    });
  }
});

// ==========================================
// 3b. Diagnostic Test for 9Router
// ==========================================
app.post('/api/test-9router', async (req, res) => {
  try {
    const config = getConfig();
    const apiKey = req.body.apiKey || config.nineRouterApiKey || 'sk-e5284dbf7511360f-bqw0y2-8f0a1d4f';
    const baseUrl = req.body.baseUrl || config.nineRouterBaseUrl || 'http://localhost:20128/v1';
    const modelName = req.body.modelName || config.nineRouterModel || 'opencode-go/glm-5.2';

    const result = await testNineRouterConnection(apiKey, baseUrl, modelName);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Error saat pengujian 9Router: ${error.message}`
    });
  }
});

// ==========================================
// 4. Analytics, Logs & Thesis Data Export
// ==========================================
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  return res.json(getAnalysisLogs(limit));
});

app.get('/api/comparisons', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  return res.json(getComparisonLogs(limit));
});

app.get('/api/stats', (_req, res) => {
  return res.json(getAggregateStats());
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

// Root catch-all serves Dashboard UI
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(`🚀 THREADIBILITY BACKEND & BENCHMARK DASHBOARD RUNNING`);
  console.log(`📡 URL API Server: http://localhost:${PORT}`);
  console.log(`📊 Dashboard UI : http://localhost:${PORT}`);
  console.log(`🔌 Endpoint Cek : http://localhost:${PORT}/api/analyze`);
  console.log(`============================================================\n`);
});
