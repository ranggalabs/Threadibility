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
  /** Dasar penilaian: dari mana keputusan diambil. */
  dasar?: 'ai_overview' | 'pencarian' | 'ciri_teks';
  factCheckSources: FactCheckSource[];
}

export interface ExtractedPost {
  text: string;
  username: string | null;
  postUrl: string | null;
  timestamp: string | null;
}

export interface AnalysisLogRecord {
  id: string;
  timestamp: string;
  post: ExtractedPost;
  latencyMs: number;
  result: AnalysisResult;
  /** Label sebenarnya (kunci jawaban) yang diisi manual untuk Confusion Matrix. */
  label?: 'HOAX' | 'BUKAN_HOAX';
}
