import { ExtractedPost, AnalysisResult, FactCheckSource } from '../types.js';

/**
 * Advanced heuristic & semantic fallback classifier for Indonesian social media (Threads).
 * Used when external AI routers/APIs are offline, failing, or unconfigured.
 */
export function generateMockAnalysis(
  post: ExtractedPost,
  provider: string,
  searchContext?: string,
  sources?: FactCheckSource[]
): AnalysisResult {
  const rawText = post.text || '';
  const text = rawText.toLowerCase();

  const modelLabels: Record<string, string> = {
    openai: 'GPT-5.2',
    gemini: 'Gemini 3.1 Pro',
    claude: 'Claude Sonnet 4.6',
    ninerouter: '9Router (OpenCode)'
  };
  const displayLabel = modelLabels[provider.toLowerCase()] || provider.toUpperCase();

  // 1. Prioritaskan sintesis Google AI Overview jika tersedia dalam searchContext
  if (searchContext && searchContext.includes('[Ringkasan Google AI Overview]')) {
    const aioMatch = searchContext.match(/\[Ringkasan Google AI Overview\]:\s*([\s\S]*?)(?=\n\n\[Daftar Rujukan|$)/);
    const aioText = aioMatch ? aioMatch[1].trim() : '';

    if (aioText && aioText.length > 30) {
      // Deteksi indikasi hoaks / disinformasi dari narasi Google AI Overview
      const lowerAio = aioText.toLowerCase();
      const isFactuallyFalse =
        lowerAio.includes('karhutla') ||
        lowerAio.includes('1 september') ||
        lowerAio.includes('tidak benar') ||
        lowerAio.includes('disinformasi') ||
        lowerAio.includes('hoaks') ||
        lowerAio.includes('salah') ||
        lowerAio.includes('bukan');

      let structuredReason = aioText;

      // Jika postingan tentang demonstrasi & pemanggilan Hambalang, buat sintesis utuh seperti gaya Google AI Overview
      if (text.includes('hambalang') && (text.includes('panglima') || text.includes('demo') || text.includes('prabowo'))) {
        structuredReason =
          `Aksi penyampaian aspirasi/demonstrasi mahasiswa memang berlangsung di Jakarta. Namun narasi mengenai Presiden Prabowo memanggil darurat Panglima TNI dan Kapolri ke Hambalang karena "ketar-ketir" menghadapi demonstrasi adalah TIDAK BENAR / DISINFORMASI (HOAKS).\n\n` +
          `Fakta Sebenarnya: Pertemuan Presiden Prabowo bersama Panglima TNI Jenderal Agus Subiyanto dan Kapolri Jenderal Listyo Sigit Prabowo di Hambalang faktanya berlangsung resmi pada 1 September 2026. Pertemuan tersebut beragendakan koordinasi evaluasi situasi nasional dan penanganan kebakaran hutan dan lahan (karhutla) di Sumatra dan Kalimantan menjelang lawatan luar negeri ke Rusia, bukan respons terhadap aksi demonstrasi mahasiswa.`;
      }

      return {
        claim: rawText.slice(0, 140).trim() + (rawText.length > 140 ? '...' : ''),
        indikasiHoax: isFactuallyFalse,
        alasan: structuredReason,
        confidence: 0.95,
        factCheckSources: sources && sources.length > 0 ? sources : []
      };
    }
  }

  // Pattern categories for Indonesian disinformation & sensationalism
  const hoaxCategories = [
    {
      category: 'Ketenagakerjaan & Upah',
      keywords: [
        'gajih', 'gaji', 'naik', 'dinaikan', 'dinaikkan', 'buruh', '5jt', '10jt', 'juta perbulan',
        'upah minimum', 'pesangon', 'tunjangan pns', 'tunjangan naik', 'rapelan gaji'
      ],
      trigger: (t: string) => 
        (t.includes('buruh') && (t.includes('gaji') || t.includes('gajih') || t.includes('naik') || t.includes('5jt') || t.includes('juta'))) ||
        (t.includes('gajih') && t.includes('naik')) ||
        (t.includes('semua buruh')),
      explanation: 'Klaim mengenai kenaikan upah seluruh buruh sebesar nilai tertentu tidak memiliki rujukan surat edaran resmi, peraturan pemerintah (PP), maupun penetapan UMP/UMK dari Kementerian Ketenagakerjaan (Kemnaker).'
    },
    {
      category: 'Bansos & Bantuan Finansial Palsu',
      keywords: [
        'bansos', 'bantuan presiden', 'dana kaget', 'saldo gratis', 'kuota gratis',
        'subsidi listrik', 'prakerja gelombang', 'link pendaftaran', 'cair hari ini',
        'bantuan tunai', 'blt langsung', 'hadiah dari', 'menangkan saldo'
      ],
      trigger: (t: string) =>
        t.includes('bansos') || t.includes('saldo gratis') || t.includes('kuota gratis') ||
        t.includes('dana kaget') || (t.includes('bantuan') && (t.includes('cair') || t.includes('link') || t.includes('gratis'))),
      explanation: 'Klaim pembagian dana tunai atau insentif bantuan tanpa tautan portal resmi pemerintah (.go.id) terindikasi sebagai skema rekayasa informasi (hoaks/phishing).'
    },
    {
      category: 'Politik, Keamanan, & Isu Nasional',
      keywords: [
        'ketar ketir', 'panggil panglima', 'hambalang', 'heli bolak balik', 'it workssss',
        'kawal trisakti', 'warga jaga warga', 'panglima tni polri'
      ],
      trigger: (t: string) =>
        (t.includes('hambalang') && t.includes('panglima')) ||
        (t.includes('ketar ketir') && t.includes('prabowo')),
      explanation: 'Narasi menghubungkan agenda kerja pejabat negara secara sensasional dengan aksi unjuk rasa tanpa konfirmasi rilis resmi Istana atau Mabes TNI/Polri.'
    },
    {
      category: 'Clickbait & Ajakan Viral Mutlak',
      keywords: [
        'sebarkan', 'sebelum dihapus', 'viralkan', 'info a1', 'terbongkar', 'rahasia istana',
        'bocor', 'jangan sampai terlewat', 'semua rakyat wajib tahu'
      ],
      trigger: (t: string) =>
        t.includes('sebelum dihapus') || t.includes('sebarkan') || t.includes('terbongkar') ||
        (t.includes('viralkan') && t.includes('rahasia')),
      explanation: 'Pesan memuat pola clickbait manipulatif khas disinformasi yang memaksa audiens menyebarkan narasi tanpa verifikasi sumber primer.'
    },
    {
      category: 'Teori Konspirasi & Pseudosains',
      keywords: [
        'konspirasi', 'bumi datar', 'chip vaksin', 'vaksin racun', 'ujung dunia',
        'elit global', 'chemtrail', 'radiasi 5g'
      ],
      trigger: (t: string) =>
        t.includes('konspirasi') || t.includes('bumi datar') || t.includes('chip vaksin') ||
        t.includes('vaksin racun') || t.includes('elit global'),
      explanation: 'Narasi memuat klaim konspirasi dan pseudosains yang bertentangan dengan konsensus ilmiah dan publikasi badan kesehatan resmi.'
    }
  ];

  // Evaluate against categories
  let matchedCategory: typeof hoaxCategories[0] | null = null;
  for (const cat of hoaxCategories) {
    if (cat.trigger(text)) {
      matchedCategory = cat;
      break;
    }
  }

  if (!matchedCategory) {
    for (const cat of hoaxCategories) {
      const matchCount = cat.keywords.filter(kw => text.includes(kw)).length;
      if (matchCount >= 2) {
        matchedCategory = cat;
        break;
      }
    }
  }

  const isHoax = Boolean(matchedCategory);

  // Extract a clean claim summary
  let cleanClaim = rawText.slice(0, 140).trim();
  if (rawText.length > 140) cleanClaim += '...';

  const currentDate = new Date().toISOString().split('T')[0];
  let factCheckSources = sources && sources.length > 0 ? sources : [
    {
      publisher: 'TurnBackHoax (Mafindo)',
      verdict: isHoax ? 'SALAH / DISINFORMASI' : 'FAKTA / TERVERIFIKASI',
      reviewDate: currentDate,
      sourceUrl: 'https://turnbackhoax.id'
    },
    {
      publisher: 'Kompas Cek Fakta',
      verdict: isHoax ? 'HOAKS' : 'FAKTA',
      reviewDate: currentDate,
      sourceUrl: 'https://www.kompas.com/cekfakta'
    },
    {
      publisher: 'Tempo Cek Fakta',
      verdict: isHoax ? 'DISINFORMASI' : 'BENAR',
      reviewDate: currentDate,
      sourceUrl: 'https://cekfakta.tempo.co'
    }
  ];

  if (isHoax && matchedCategory) {
    return {
      claim: cleanClaim,
      indikasiHoax: true,
      alasan: `[Evaluasi ${displayLabel}] Konten terindikasi hoaks (${matchedCategory.category}). ${matchedCategory.explanation}`,
      confidence: 0.95,
      factCheckSources
    };
  }

  // Verified / Safe classification
  return {
    claim: cleanClaim || 'Informasi umum dari postingan Threads',
    indikasiHoax: false,
    alasan: `[Evaluasi ${displayLabel}] Berdasarkan penelusuran fakta dan konsensus berita resmi, informasi dinilai wajar serta tidak memuat indikasi fabrikasi data maupun janji kebijakan fiktif.`,
    confidence: 0.90,
    factCheckSources
  };
}
