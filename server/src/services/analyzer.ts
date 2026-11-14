import { ExtractedPost, AnalysisResult } from '../types.js';
import { classifyPost } from './ruleClassifier.js';
import { saveAnalysisLog } from '../storage.js';
import { searchFactCheckSources } from './webSearch.js';

/**
 * Menganalisis satu postingan:
 * 1. menelusuri Google AI Overview (cadangan: Google News RSS) untuk ringkasan dan rujukan,
 * 2. mengklasifikasi ringkasan itu dengan aturan kata kunci (tanpa model bahasa).
 */
export async function analyzePost(post: ExtractedPost): Promise<{
  analysis: AnalysisResult;
  latencyMs: number;
}> {
  const startTime = Date.now();

  const searchResult = await searchFactCheckSources(post.text, post.postUrl);
  const sources = searchResult.sources;

  const base = classifyPost(post, searchResult.summaryContext, sources);
  const analysis: AnalysisResult = {
    ...base,
    factCheckSources: sources.length > 0 ? sources : base.factCheckSources || []
  };
  const latencyMs = Date.now() - startTime;

  saveAnalysisLog({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    post,
    latencyMs,
    result: analysis
  });

  return { analysis, latencyMs };
}
