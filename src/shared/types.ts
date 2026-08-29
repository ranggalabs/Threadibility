export interface FactCheckSource {
  publisher: string;
  verdict: string;
  reviewDate: string | null;
  sourceUrl: string;
}

export interface AnalysisResult {
  claim: string;
  indikasiHoax: boolean;
  alasan: string;
  confidence: number;
  factCheckSources: FactCheckSource[];
}

export interface ExtractedPost {
  text: string;
  username: string | null;
  postUrl: string | null;
  timestamp: string | null;
}

export interface HistoryRecord {
  id: string; // Unique ID (timestamp based)
  post: ExtractedPost;
  analysis: AnalysisResult;
  analyzedAt: string; // ISO string
}

export type ExtensionMessage =
  | { type: 'REQUEST_EXTRACTED_POST'; payload: { tempId: string } }
  | { type: 'EXTRACTED_POST_RESPONSE'; payload: ExtractedPost & { tempId: string } }
  | { type: 'INJECT_BADGE'; payload: { tempId: string; analysis: AnalysisResult } }
  | { type: 'ANALYSIS_ERROR'; payload: { message: string } };
