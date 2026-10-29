export interface FactCheckSource {
  publisher: string;
  title?: string;
  verdict: string;
  reviewDate: string | null;
  sourceUrl: string;
}

export interface AnalysisResult {
  claim: string;
  indikasiHoax: boolean;
  alasan: string;
  confidence: number; // 0.0 - 1.0
  factCheckSources: FactCheckSource[];
}

export interface ExtractedPost {
  text: string;
  username: string | null;
  postUrl: string | null;
  timestamp: string | null;
}

export type ModelProvider = 'openai' | 'gemini' | 'claude' | 'nineRouter';

export interface ModelConfig {
  activeModel: ModelProvider;
  openaiApiKey: string;
  geminiApiKey: string;
  claudeApiKey: string;
  nineRouterApiKey?: string;
  nineRouterBaseUrl?: string;
  nineRouterModel?: string;
  openaiModel: string;
  geminiModel: string;
  claudeModel: string;
  temperature: number;
  openaiBaseUrl?: string;
  geminiBaseUrl?: string;
  claudeBaseUrl?: string;
}

export interface ModelBenchmarkResult {
  provider: ModelProvider;
  modelName: string;
  latencyMs: number;
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
}

export interface AnalysisLogRecord {
  id: string;
  timestamp: string;
  post: ExtractedPost;
  provider: ModelProvider;
  modelName: string;
  latencyMs: number;
  result: AnalysisResult;
}

export interface ComparisonLogRecord {
  id: string;
  timestamp: string;
  post: ExtractedPost;
  results: Record<ModelProvider, ModelBenchmarkResult>;
}
