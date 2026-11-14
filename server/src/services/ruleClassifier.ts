import { ExtractedPost, AnalysisResult, FactCheckSource } from '../types.js';

/**
 * Pengklasifikasi berbasis aturan (tanpa model bahasa).
 * Keputusan "terindikasi hoax" diambil dari (a) kata kunci pada ringkasan Google AI Overview,
 * (b) label rujukan hasil pencarian, dan (c) daftar kategori kata kunci disinformasi Indonesia.
 * Hasilnya perkiraan sistem, bukan keputusan lembaga pemeriksa fakta resmi.
 */
export function classifyPost(
  post: ExtractedPost,
  searchContext?: string,
  sources?: FactCheckSource[]
): AnalysisResult {
  const rawText = (post.text || '')
    .replace(/\bVerified\s*baru\s*saja\b/gi, '')
    .trim();
  const text = rawText.toLowerCase();

  const cleanClaim = rawText.slice(0, 140).trim() + (rawText.length > 140 ? '...' : '');

  // 1. Prioritaskan sintesis Google AI Overview jika tersedia dan valid dalam searchContext
  if (searchContext && searchContext.includes('[Ringkasan Google AI Overview]')) {
    const aioMatch = searchContext.match(/\[Ringkasan Google AI Overview\]:\s*([\s\S]*?)(?=\n\n\[Daftar Rujukan|$)/);
    const aioText = aioMatch ? aioMatch[1].trim() : '';

    const isInvalidAio =
      !aioText ||
      aioText.length < 40 ||
      /tidak tersedia untuk penelusuran ini|tidak dapat membuat ringkasan dengan ai|an ai overview is not available/i.test(aioText) ||
      /:root\s*\{|\.[a-zA-Z0-9_-]+\s*\{display:/i.test(aioText);

    if (!isInvalidAio) {
      const lowerAio = aioText.toLowerCase();
      const firstParagraph = aioText.slice(0, 320).toLowerCase();

      const hasExplicitTrueConfirmation =
        /\b(adalah fakta|bukan hoaks|bukan hoax|benar telah|memang benar|resmi menyampaikan|memberikan klarifikasi dan menyampaikan permohonan maaf|faktanya memang|terkonfirmasi benar)\b/i.test(firstParagraph);

      const cleanedForHoax = aioText.replace(/\b(bukan|tidak\s+terindikasi)\s+(hoaks|hoax|disinformasi|misinformasi|berita\s+bohong|palsu)\b/gi, '');
      const hasExplicitHoaxSignal =
        /\b(hoaks|hoax|disinformasi|misinformasi|tidak benar|tidak sepenuhnya benar|keliru|menyesatkan|berita bohong|kabar bohong|fiktif|sindiran|satir|satire|parodi|lelucon|candaan|sarkas|sarkasme|hiperbolik)\b/i.test(cleanedForHoax) ||
        (lowerAio.includes('karhutla') && lowerAio.includes('hambalang'));

      const isFactuallyFalse = hasExplicitTrueConfirmation ? false : hasExplicitHoaxSignal;

      const normalizedSources = (sources && sources.length > 0 ? sources : []).map(s => ({
        ...s,
        verdict: isFactuallyFalse && s.verdict === 'BERITA TERKAIT' ? 'FAKTA PEMBANDING' : s.verdict
      }));

      return {
        claim: cleanClaim,
        indikasiHoax: isFactuallyFalse,
        // Bila terindikasi hoaks, tampilkan penjelasan penelusuran apa adanya. Bila tidak, jangan
        // menyatakan klaim itu benar (sistem bukan lembaga pemeriksa fakta resmi): cukup nyatakan
        // tidak ada indikasi dan arahkan pembaca ke rujukan.
        alasan: isFactuallyFalse
          ? aioText
          : 'Tidak ditemukan indikasi hoaks pada klaim ini berdasarkan penelusuran sistem. Periksa rujukan berita terkait di bawah untuk memastikan sendiri.',
        factCheckSources: normalizedSources
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

  const hasHoaxSourceVerdict = Boolean(
    sources && sources.some(s => /HOAKS|DISINFORMASI/i.test(s.verdict || ''))
  );
  const isHoax = Boolean(matchedCategory) || hasHoaxSourceVerdict;

  const factCheckSources: FactCheckSource[] = sources && sources.length > 0 ? sources : [];

  if (isHoax && matchedCategory) {
    return {
      claim: cleanClaim,
      indikasiHoax: true,
      alasan: `Konten terindikasi hoaks (${matchedCategory.category}). ${matchedCategory.explanation}`,
      factCheckSources
    };
  }

  if (isHoax && hasHoaxSourceVerdict && sources && sources.length > 0) {
    const topHoax = sources.find(s => /HOAKS|DISINFORMASI/i.test(s.verdict || '')) || sources[0];
    return {
      claim: cleanClaim,
      indikasiHoax: true,
      alasan: `Berdasarkan rujukan cek fakta resmi (${topHoax.publisher}: "${topHoax.title}"), klaim dalam unggahan ini terindikasi tidak benar / disinformasi.`,
      factCheckSources
    };
  }

  // Bukan hoaks dan ada artikel berita terkait (hasil bukan jaminan kebenaran)
  if (sources && sources.length > 0 && sources[0].verdict !== 'PENCARIAN TOPIK') {
    const topPublishers = Array.from(new Set(sources.slice(0, 3).map(s => s.publisher))).join(', ');
    const leadTitle = sources[0].title || '';
    return {
      claim: cleanClaim || 'Informasi umum dari postingan Threads',
      indikasiHoax: false,
      alasan: `Tidak ditemukan indikasi hoaks pada klaim ini berdasarkan penelusuran sistem. Liputan terkait dari ${topPublishers}, antara lain "${leadTitle}", dapat dibaca pada rujukan di bawah.`,
      factCheckSources
    };
  }

  return {
    claim: cleanClaim || 'Informasi umum dari postingan Threads',
    indikasiHoax: false,
    alasan: `Tidak ditemukan indikasi hoaks pada klaim ini berdasarkan penelusuran sistem. Belum ada rujukan berita yang cukup untuk memastikan kebenarannya, sehingga periksa rujukan di bawah.`,
    factCheckSources
  };
}
