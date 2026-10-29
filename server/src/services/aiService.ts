import { ExtractedPost, AnalysisResult, ModelBenchmarkResult, ModelProvider } from '../types.js';
import { getConfig } from '../config.js';
import { analyzeWithOpenAI } from './openai.js';
import { analyzeWithGemini } from './gemini.js';
import { analyzeWithClaude } from './claude.js';
import { analyzeWithNineRouter } from './nineRouter.js';
import { generateMockAnalysis } from './mockFallback.js';
import { saveAnalysisLog, saveComparisonLog } from '../storage.js';
import { searchFactCheckSources } from './webSearch.js';

/**
 * Replaces whatever sources a model (or the heuristic fallback) produced with real articles
 * found by a topical web search, so references always point to pages about the analysed claim.
 */
async function attachSearchedSources(post: ExtractedPost, analysis: AnalysisResult): Promise<AnalysisResult> {
  try {
    const search = await searchFactCheckSources(post.text, post.postUrl);
    if (search.sources.length >= 5) {
      return { ...analysis, factCheckSources: search.sources };
    }
  } catch (err) {
    console.warn('[Threadibility API] Penelusuran referensi gagal:', err);
  }
  return analysis;
}

export async function analyzeActiveModel(post: ExtractedPost): Promise<{
  analysis: AnalysisResult;
  provider: ModelProvider;
  modelName: string;
  latencyMs: number;
}> {
  const config = getConfig();
  const activeProvider = config.activeModel;

  let benchmarkResult: ModelBenchmarkResult;

  switch (activeProvider) {
    case 'openai':
      if (!config.openaiApiKey || !config.openaiApiKey.trim()) {
        benchmarkResult = {
          provider: 'openai',
          modelName: `${config.openaiModel} (Simulasi)`,
          latencyMs: 380,
          success: true,
          analysis: generateMockAnalysis(post, 'openai')
        };
      } else {
        benchmarkResult = await analyzeWithOpenAI(
          post,
          config.openaiApiKey,
          config.openaiModel,
          config.temperature
        );
      }
      break;
    case 'gemini':
      if (!config.geminiApiKey || !config.geminiApiKey.trim()) {
        benchmarkResult = {
          provider: 'gemini',
          modelName: `${config.geminiModel} (Simulasi)`,
          latencyMs: 290,
          success: true,
          analysis: generateMockAnalysis(post, 'gemini')
        };
      } else {
        benchmarkResult = await analyzeWithGemini(
          post,
          config.geminiApiKey,
          config.geminiModel,
          config.temperature
        );
      }
      break;
    case 'claude':
      if (!config.claudeApiKey || !config.claudeApiKey.trim()) {
        benchmarkResult = {
          provider: 'claude',
          modelName: `${config.claudeModel} (Simulasi)`,
          latencyMs: 420,
          success: true,
          analysis: generateMockAnalysis(post, 'claude')
        };
      } else {
        benchmarkResult = await analyzeWithClaude(
          post,
          config.claudeApiKey,
          config.claudeModel,
          config.temperature,
          config.claudeBaseUrl
        );
      }
      break;
    case 'nineRouter':
      if (!config.nineRouterApiKey || !config.nineRouterApiKey.trim()) {
        benchmarkResult = {
          provider: 'nineRouter',
          modelName: `${config.nineRouterModel || 'opencode-go/glm-5.2'} (Simulasi)`,
          latencyMs: 320,
          success: true,
          analysis: generateMockAnalysis(post, '9Router / OpenCode')
        };
      } else {
        benchmarkResult = await analyzeWithNineRouter(
          post,
          config.nineRouterApiKey,
          config.nineRouterModel || 'opencode-go/glm-5.2',
          config.temperature,
          config.nineRouterBaseUrl || 'http://localhost:20128/v1'
        );
      }
      break;
    default:
      throw new Error(`Provider tidak dikenali: ${activeProvider}`);
  }

  if (!benchmarkResult.success || !benchmarkResult.analysis) {
    console.warn(`[Threadibility API] Provider ${activeProvider} gagal (${benchmarkResult.error}). Menggunakan evaluasi cadangan.`);
    benchmarkResult = {
      provider: activeProvider,
      modelName: `${benchmarkResult.modelName || activeProvider} (Cadangan)`,
      latencyMs: benchmarkResult.latencyMs || 400,
      success: true,
      analysis: generateMockAnalysis(post, activeProvider)
    };
  }

  const analysis = await attachSearchedSources(
    post,
    benchmarkResult.analysis || generateMockAnalysis(post, activeProvider)
  );

  // Save to history storage
  saveAnalysisLog({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    post,
    provider: activeProvider,
    modelName: benchmarkResult.modelName,
    latencyMs: benchmarkResult.latencyMs,
    result: analysis
  });

  return {
    analysis,
    provider: activeProvider,
    modelName: benchmarkResult.modelName,
    latencyMs: benchmarkResult.latencyMs
  };
}

export async function compareAllModels(post: ExtractedPost): Promise<{
  id: string;
  timestamp: string;
  post: ExtractedPost;
  results: Record<ModelProvider, ModelBenchmarkResult>;
}> {
  const config = getConfig();

  // Execute all models in parallel (with mock fallback if key not configured)
  const [openaiRes, geminiRes, claudeRes, nineRouterRes] = await Promise.all([
    config.openaiApiKey?.trim()
      ? analyzeWithOpenAI(post, config.openaiApiKey, config.openaiModel, config.temperature)
      : Promise.resolve<ModelBenchmarkResult>({
          provider: 'openai',
          modelName: `${config.openaiModel} (Simulasi)`,
          latencyMs: 380,
          success: true,
          analysis: generateMockAnalysis(post, 'openai')
        }),
    config.geminiApiKey?.trim()
      ? analyzeWithGemini(post, config.geminiApiKey, config.geminiModel, config.temperature)
      : Promise.resolve<ModelBenchmarkResult>({
          provider: 'gemini',
          modelName: `${config.geminiModel} (Simulasi)`,
          latencyMs: 290,
          success: true,
          analysis: generateMockAnalysis(post, 'gemini')
        }),
    config.claudeApiKey?.trim()
      ? analyzeWithClaude(post, config.claudeApiKey, config.claudeModel, config.temperature, config.claudeBaseUrl)
      : Promise.resolve<ModelBenchmarkResult>({
          provider: 'claude',
          modelName: `${config.claudeModel} (Simulasi)`,
          latencyMs: 420,
          success: true,
          analysis: generateMockAnalysis(post, 'claude')
        }),
    config.nineRouterApiKey?.trim()
      ? analyzeWithNineRouter(
          post,
          config.nineRouterApiKey,
          config.nineRouterModel || 'opencode-go/glm-5.2',
          config.temperature,
          config.nineRouterBaseUrl || 'http://localhost:20128/v1'
        )
      : Promise.resolve<ModelBenchmarkResult>({
          provider: 'nineRouter',
          modelName: `${config.nineRouterModel || 'opencode-go/glm-5.2'} (Simulasi)`,
          latencyMs: 320,
          success: true,
          analysis: generateMockAnalysis(post, '9Router / OpenCode')
        })
  ]);

  for (const r of [openaiRes, geminiRes, claudeRes, nineRouterRes]) {
    if (r.analysis) r.analysis = await attachSearchedSources(post, r.analysis);
  }

  const results: Record<ModelProvider, ModelBenchmarkResult> = {
    openai: openaiRes,
    gemini: geminiRes,
    claude: claudeRes,
    nineRouter: nineRouterRes
  };

  const logRecord = {
    id: `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    post,
    results
  };

  saveComparisonLog(logRecord);

  return logRecord;
}
