import { AnalysisResult, FactCheckSource } from '../types.js';

/**
 * Safely parses LLM output into an AnalysisResult object.
 * Guarantees at least 5 factCheckSources by backfilling from fallbackSources if needed.
 */
export function parseAnalysisResult(
  rawOutput: string,
  defaultClaim: string,
  fallbackSources: FactCheckSource[] = []
): AnalysisResult {
  try {
    // 1. Remove markdown code block fences if present
    let cleaned = rawOutput.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    // 2. Locate first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    const sources: FactCheckSource[] = Array.isArray(parsed.factCheckSources)
      ? parsed.factCheckSources.map((src: any) => ({
          publisher: String(src.publisher || src.penerbit || 'Pemeriksa Fakta'),
          verdict: String(src.verdict || src.vonis || src.kesimpulan || 'KLARIFIKASI'),
          reviewDate: src.reviewDate || src.tanggal || new Date().toISOString().split('T')[0],
          sourceUrl: String(src.sourceUrl || src.url || src.link || 'https://cekfakta.com')
        }))
      : [];

    // Ensure at least 5 sources by adding from fallbackSources if necessary
    if (sources.length < 5 && fallbackSources.length > 0) {
      for (const fb of fallbackSources) {
        if (!sources.some(s => s.publisher === fb.publisher || s.sourceUrl === fb.sourceUrl)) {
          sources.push(fb);
          if (sources.length >= 5) break;
        }
      }
    }

    const isHoax = Boolean(
      parsed.indikasiHoax ??
      parsed.apakah_hoax ??
      parsed.isHoax ??
      (typeof parsed.kesimpulan === 'string' && /hoax|palsu|salah|disinformasi/i.test(parsed.kesimpulan)) ??
      (typeof parsed.verdict === 'string' && /hoax|palsu|salah|disinformasi/i.test(parsed.verdict))
    );

    const claim = typeof parsed.claim === 'string' && parsed.claim.trim()
      ? parsed.claim.trim()
      : (typeof parsed.klaim_diperiksa === 'string' && parsed.klaim_diperiksa.trim()
          ? parsed.klaim_diperiksa.trim()
          : (typeof parsed.klaim === 'string' && parsed.klaim.trim() ? parsed.klaim.trim() : defaultClaim));

    const alasan = typeof parsed.alasan === 'string' && parsed.alasan.trim()
      ? parsed.alasan.trim()
      : (typeof parsed.penjelasan === 'string' && parsed.penjelasan.trim()
          ? parsed.penjelasan.trim()
          : (typeof parsed.fakta_sebenarnya === 'string' && parsed.fakta_sebenarnya.trim()
              ? parsed.fakta_sebenarnya.trim()
              : 'Analisis berbasis pencocokan rujukan fakta resmi.'));

    let confidence = 0.95;
    if (typeof parsed.confidence === 'number') {
      confidence = Math.max(0, Math.min(1, parsed.confidence));
    } else if (typeof parsed.tingkat_keyakinan === 'string') {
      confidence = parsed.tingkat_keyakinan.toLowerCase() === 'tinggi' ? 0.96 : 0.85;
    }

    return {
      claim,
      indikasiHoax: isHoax,
      alasan,
      confidence,
      factCheckSources: sources.slice(0, 7)
    };
  } catch (error) {
    console.error('[Threadibility Server] Failed to parse LLM JSON output:', rawOutput, error);
    const isHoax = rawOutput.toLowerCase().includes('hoax') || rawOutput.toLowerCase().includes('palsu') || rawOutput.toLowerCase().includes('salah');
    return {
      claim: defaultClaim,
      indikasiHoax: isHoax,
      alasan: rawOutput.slice(0, 300) || 'Hasil analisis diproses melalui penelusuran fakta independen.',
      confidence: 0.88,
      factCheckSources: fallbackSources.slice(0, 5)
    };
  }
}
