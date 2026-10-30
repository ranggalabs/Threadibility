import { FactCheckSource } from '../types.js';
import {
  fetchGoogleAiOverview,
  extractFactualContextFromAio,
  isSummaryIndicatingHoaxOrSatire
} from './googleAiOverview.js';

/**
 * Real topical web search for fact-check references.
 *
 * Uses Google AI Overviews ("Ringkasan AI") as the primary engine and Google News RSS search
 * (guided by both the claim and the factual context extracted from Google AI Overview)
 * to find concrete news & fact-check articles that verify or debunk the claim.
 */

export interface FactCheckResult {
  query: string;
  sources: FactCheckSource[];
  summaryContext: string;
}

interface RawArticle {
  title: string;
  publisher: string;
  date: string | null;
  link: string;
  score: number;
}

const STOPWORDS = new Set([
  'yang', 'dan', 'ini', 'itu', 'pada', 'untuk', 'dari', 'bisa', 'akan', 'dengan', 'adalah', 'atau',
  'juga', 'dalam', 'karena', 'sudah', 'telah', 'oleh', 'saya', 'kita', 'kami', 'mereka', 'nya',
  'ada', 'tidak', 'tak', 'ke', 'di', 'yg', 'dgn', 'sih', 'dong', 'deh', 'lah', 'kok', 'lagi',
  'ingin', 'mau', 'jadi', 'para', 'sebuah', 'agar', 'supaya', 'sangat', 'banget', 'aja', 'saja',
  'setelah', 'sebelum', 'ketika', 'saat', 'bahwa', 'sebagai', 'ya', 'si', 'nih', 'tuh', 'pun',
  'http', 'https', 'www', 'com',
  'mendadak', 'tiba', 'katanya', 'bakal', 'ternyata', 'wow', 'info', 'viral', 'breaking', 'kabarnya',
  'konon', 'infonya', 'heboh', 'gaes', 'guys', 'bro', 'min', 'kak', 'masa', 'apa', 'siapa', 'kenapa',
  'valid', 'ketar', 'ketir', 'makanya', 'workssss', 'it', 'kawal', 'warga', 'jaga', 'hari', 'pagi',
  'siang', 'malam', 'konten', 'kreator', 'sampaikan', 'permintaan', 'melalui', 'terkait', 'soal',
  'baru', 'verified', 'verifiedbaru', 'bolak', 'balik', 'diatas', 'udara', 'lanjutkan', 'acara',
  'hotel', 'kamis', 'senin', 'selasa', 'rabu', 'jumat', 'sabtu', 'minggu',
  'demi', 'ikut', 'rela', 'salah', 'satu', 'dua', 'tiga', 'meninggalkan', 'membuat', 'menjadi',
  'seorang', 'beberapa', 'banyak', 'semua', 'punya', 'kasih', 'bilang', 'kata', 'anak', 'orang',
  'cuma', 'hanya', 'atas', 'bawah', 'depan', 'belakang', 'antara'
]);

const FACTCHECK_TERMS = /hoaks|hoax|cek fakta|cekfakta|fakta|klarifikasi|bantah|benarkah|disinformasi|misinformasi|keliru|salah|tidak benar|menyesatkan|turnbackhoax/i;
const TRUSTED_PUBLISHERS = /kompas|tempo|antara|detik|cnn indonesia|liputan6|turnbackhoax|cekfakta|mafindo|tirto|kumparan|bbc|republika|media indonesia|suara\.com|tribun|jawa pos|cnbc indonesia|bisnis\.com|katadata|merdeka|okezone|viva|sindonews|metro tv|kominfo|komdigi|\.go\.id/i;

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; value: FactCheckResult }>();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractKeywords(text: string, max = 14): string[] {
  const words = (text || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[\w.]+/g, ' ')
    .replace(/\bverified(\s*baru\s*saja)?\b/gi, ' ')
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/\(di\)sumpah\(in\)/gi, 'sumpah')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => (w.length > 2 || /^\d{4}$/.test(w) || w === 'hi') && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, max);
}

function verdictLabel(title: string, isHoaxContext: boolean): string {
  if (/\b(hoaks|hoax|disinformasi|misinformasi)\b|\[(salah|hoaks|keliru)\]|cek fakta.*(keliru|salah|tidak benar|menyesatkan|palsu)/i.test(title)) {
    return 'HOAKS / DISINFORMASI';
  }
  if (/klarifikasi|bantah|tegaskan|tegas|pastikan|minta maaf|permintaan maaf|buka suara/i.test(title)) {
    return isHoaxContext ? 'KLARIFIKASI / BANTAHAN' : 'KLARIFIKASI / FAKTA';
  }
  if (/cek fakta|cekfakta|benarkah|fakta/i.test(title)) return 'CEK FAKTA';
  return isHoaxContext ? 'FAKTA PEMBANDING' : 'FAKTA / TERVERIFIKASI';
}

function parseRss(xml: string, keywords: string[], aioFactKeywords: string[] = []): RawArticle[] {
  const items = xml.split('<item>').slice(1);
  const out: RawArticle[] = [];

  for (const it of items) {
    const get = (tag: string): string => {
      const m = it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1]) : '';
    };

    const fullTitle = get('title');
    const link = get('link');
    if (!fullTitle || !link) continue;

    const publisher = get('source') || 'Sumber Berita';
    const title = fullTitle.replace(new RegExp(`\\s+-\\s+${publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim();

    const lower = title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
    const matchedClaim = keywords.filter(k => lower.includes(k)).length;
    const matchedAioFact = aioFactKeywords.filter(k => lower.includes(k)).length;

    const claimOverlap = keywords.length ? matchedClaim / keywords.length : 0;
    const aioOverlap = aioFactKeywords.length ? matchedAioFact / aioFactKeywords.length : 0;

    let hasEventContext = true;
    if (keywords.length >= 5) {
      const eventKeywords = keywords.slice(2);
      const eventMatches = eventKeywords.filter(k => lower.includes(k)).length;
      if (eventMatches === 0 && matchedClaim < 3 && matchedAioFact < 3) {
        hasEventContext = false;
      }
    }

    let score = Math.max(claimOverlap, aioOverlap) * 10 + Math.min(matchedClaim, matchedAioFact);
    if (FACTCHECK_TERMS.test(title)) score += 3;
    if (TRUSTED_PUBLISHERS.test(publisher) || TRUSTED_PUBLISHERS.test(link)) score += 2;

    const pub = get('pubDate');
    let date: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    }

    const minClaimMatch = keywords.length >= 5 ? 3 : Math.min(keywords.length, 2);
    const hasLeadAnchor = keywords.slice(0, 2).some(k => lower.includes(k));
    const isClaimRelevant = hasLeadAnchor && matchedClaim >= minClaimMatch && hasEventContext;
    const isAioFactRelevant = hasLeadAnchor && aioFactKeywords.length >= 4 && matchedAioFact >= 3;

    out.push({ title, publisher, date, link, score: (isClaimRelevant || isAioFactRelevant) ? score : -1 });
  }
  return out;
}

async function fetchNews(query: string, keywords: string[], aioFactKeywords: string[] = []): Promise<RawArticle[]> {
  const url = `https://news.google.com/rss/search?hl=id&gl=ID&ceid=ID:id&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'id-ID,id;q=0.9' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), keywords, aioFactKeywords);
  } catch {
    return [];
  }
}

export async function searchFactCheckSources(
  claimText: string,
  _postUrl?: string | null
): Promise<FactCheckResult> {
  claimText = (claimText || '').normalize('NFKC');
  const heuristic = extractKeywords(claimText, 14);
  const key = heuristic.join(' ');

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  // 1. PRIMARY ENGINE: Google AI Overviews ("Ringkasan AI") via browser automation
  let aioSummary = '';
  let aioSources: FactCheckSource[] = [];
  try {
    const aio = await fetchGoogleAiOverview(claimText);
    if (aio.summaryText) {
      aioSummary = aio.summaryText;
    }
    if (aio.sources && aio.sources.length > 0) {
      aioSources = aio.sources;
    }

    if (aio.success && aioSources.length >= 3) {
      console.log(`[Threadibility] Berhasil mengekstrak Ringkasan AI dan ${aioSources.length} rujukan dari Google AI Overview.`);
      let summaryContext = `[Ringkasan Google AI Overview]:\n${aioSummary}\n\n[Daftar Rujukan Google]:\n`;
      summaryContext += aioSources
        .map((s, i) => `${i + 1}. [${s.publisher}] "${s.title}" - ${s.verdict}`)
        .join('\n');

      const value: FactCheckResult = {
        query: `${heuristic.slice(0, 8).join(' ')} (Google AI Overview)`,
        sources: aioSources.slice(0, 6),
        summaryContext
      };
      cache.set(key, { at: Date.now(), value });
      return value;
    }
  } catch (err) {
    console.warn('[Threadibility] Google AI Overview gagal, beralih ke pencarian berita RSS:', err);
  }

  // 2. SECONDARY / SUPPLEMENTAL ENGINE: Google News RSS Search guided by AI Overview factual context
  const isHoaxOrSatire = isSummaryIndicatingHoaxOrSatire(aioSummary);
  const aioFactKeywords = extractFactualContextFromAio(aioSummary, heuristic);
  const keywords = heuristic;

  const qEntityAndEvent = keywords.length > 6
    ? [...keywords.slice(0, 2), ...keywords.slice(4, 8)].join(' ')
    : keywords.slice(0, 6).join(' ');
  const qFirstClause = keywords.slice(0, 6).join(' ');
  const qTailContext = keywords.length > 7
    ? [...keywords.slice(0, 2), ...keywords.slice(5, 7), ...keywords.slice(9, 12)].join(' ')
    : `${qFirstClause} cek fakta`;

  const fallbackQueries: string[] = [qEntityAndEvent, qFirstClause, qTailContext];

  // Jika Google AI Overview menjelaskan konteks peristiwa asli di balik hoaks/satir, cari berita resmi peristiwa tersebut!
  if (aioFactKeywords.length >= 4) {
    fallbackQueries.unshift(aioFactKeywords.slice(0, 6).join(' '));
    if (aioFactKeywords.length >= 6) {
      fallbackQueries.unshift([...aioFactKeywords.slice(0, 3), ...aioFactKeywords.slice(4, 7)].join(' '));
    }
  }

  // Jika klaim terdeteksi hoaks/satir, tambahkan pencarian kata kunci jangkar + indikasi palsu/klarifikasi
  if (isHoaxOrSatire && keywords.length >= 3) {
    const anchorWords = keywords.slice(0, 3).join(' ');
    fallbackQueries.unshift(`${anchorWords} palsu OR klarifikasi OR bayaran OR hoaks`);
  }

  const queries = Array.from(new Set(fallbackQueries.filter(q => q.trim().length > 0))).slice(0, 6);
  const batches = await Promise.all(queries.map(q => fetchNews(q, keywords, aioFactKeywords)));

  const seen = new Set<string>();
  const merged: RawArticle[] = [];
  for (const a of batches.flat()) {
    const titleKey = a.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (seen.has(a.link) || seen.has(titleKey)) continue;
    seen.add(a.link);
    seen.add(titleKey);
    merged.push(a);
  }

  const ranked = merged.filter(a => a.score >= 0).sort((a, b) => b.score - a.score);

  const perPublisher = new Map<string, number>();
  const picked: RawArticle[] = [];
  for (const a of ranked) {
    const n = perPublisher.get(a.publisher) || 0;
    if (n >= 2) continue;
    perPublisher.set(a.publisher, n + 1);
    picked.push(a);
    if (picked.length >= 6) break;
  }

  const rssSources: FactCheckSource[] = picked.map(a => ({
    publisher: a.publisher,
    title: a.title,
    verdict: verdictLabel(a.title, isHoaxOrSatire),
    reviewDate: a.date,
    sourceUrl: a.link
  }));

  const combinedSources: FactCheckSource[] = [...aioSources];
  const seenTitles = new Set(aioSources.map(s => (s.title || '').toLowerCase().slice(0, 35)));
  const seenUrls = new Set(aioSources.map(s => s.sourceUrl));

  for (const rs of rssSources) {
    if (combinedSources.length >= 6) break;
    const tKey = (rs.title || '').toLowerCase().slice(0, 35);
    if (seenUrls.has(rs.sourceUrl) || (tKey && seenTitles.has(tKey))) continue;
    seenUrls.add(rs.sourceUrl);
    if (tKey) seenTitles.add(tKey);
    combinedSources.push(rs);
  }

  const sources = combinedSources.slice(0, 6);

  if (sources.length === 0) {
    const topicLabel = aioFactKeywords.length >= 3 ? aioFactKeywords.slice(0, 5).join(' ') : qFirstClause;
    const q = encodeURIComponent(topicLabel);
    sources.push(
      { publisher: 'TurnBackHoax (Mafindo)', title: `Telusuri "${topicLabel}" di TurnBackHoax`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://turnbackhoax.id/?s=${q}` },
      { publisher: 'Kompas Cek Fakta', title: `Telusuri "${topicLabel}" di Kompas.com`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://search.kompas.com/search?q=${q}` },
      { publisher: 'Google News', title: `Liputan berita terkait: ${topicLabel}`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://news.google.com/search?q=${q}&hl=id&gl=ID&ceid=ID:id` }
    );
  }

  let summaryContext = '';
  if (aioSummary) {
    summaryContext = `[Ringkasan Google AI Overview]:\n${aioSummary}\n\n[Daftar Rujukan Google]:\n` +
      sources.map((s, i) => `${i + 1}. [${s.publisher}] "${s.title}" - ${s.verdict}`).join('\n');
  } else if (aioSources.length > 0 || picked.length > 0) {
    summaryContext = sources
      .map((s, i) => `${i + 1}. [${s.publisher}] "${s.title}"${s.reviewDate ? ` (${s.reviewDate})` : ''} - ${s.verdict}`)
      .join('\n');
  } else {
    summaryContext =
      'TIDAK ADA artikel yang relevan ditemukan untuk klaim ini. Ketiadaan artikel BUKAN bukti bahwa klaim palsu; nilai klaim berdasarkan kewajaran dan pengetahuan Anda, dan turunkan confidence.';
  }

  const value: FactCheckResult = {
    query: aioSummary ? `${qFirstClause} (Google AI Overview)` : qFirstClause,
    sources,
    summaryContext
  };
  if (aioSummary || picked.length > 0) {
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}
