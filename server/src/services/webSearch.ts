import { FactCheckSource } from '../types.js';
import { getConfig } from '../config.js';
import { fetchGoogleAiOverview } from './googleAiOverview.js';

/**
 * Real topical web search for fact-check references.
 *
 * Uses the Google News RSS search (no API key needed) to find actual articles that discuss the
 * analysed claim: fact-check articles, hoax clarifications and news coverage. Every returned
 * source is a concrete article (headline + publisher + date + link) about the topic, never a
 * generic homepage.
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
  'konon', 'infonya', 'heboh', 'gaes', 'guys', 'bro', 'min', 'kak', 'masa', 'apa', 'siapa', 'kenapa'
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

export function extractKeywords(text: string, max = 8): string[] {
  const words = (text || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, max);
}

/**
 * Ask the configured 9Router model to turn a casual / typo-ridden social media claim into a few
 * formal news search queries. Returns [] on any failure so callers can fall back to heuristics.
 */
async function generateQueriesWithLLM(claim: string): Promise<string[]> {
  const cfg = getConfig();
  const apiKey = (cfg.nineRouterApiKey || '').trim();
  if (!apiKey) return [];

  let model = (cfg.nineRouterModel || '').trim();
  if (!model) return [];
  if (model.includes('muse-spark') && !model.includes('/')) model = `oc/${model}`;

  const base = (cfg.nineRouterBaseUrl || 'http://localhost:20128/v1').trim().replace(/\/+$/, '');
  const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;

  const prompt =
    `Ubah klaim media sosial berikut menjadi TIGA query pencarian berita Indonesia yang formal dan ringkas (3-7 kata). ` +
    `Perbaiki typo dan bahasa gaul, fokus pada tokoh/entitas dan peristiwa inti.\n` +
    `Query 1: topik inti + "cek fakta".\n` +
    `Query 2: topik inti + "hoaks" atau "bantahan".\n` +
    `Query 3: aturan/dasar hukum/fakta resmi yang menjelaskan mengapa klaim itu benar atau tidak mungkin terjadi.\n` +
    `Jawab HANYA dengan JSON array berisi 3 string, tanpa teks lain.\n\nKlaim: """${claim.slice(0, 400)}"""`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const content: string = data.choices?.[0]?.message?.content || '';
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 2)
      .map(q => q.replace(/\s+/g, ' ').trim())
      .slice(0, 3);
  } catch {
    return [];
  }
}

function verdictLabel(title: string): string {
  if (/hoaks|hoax|disinformasi|misinformasi|keliru|menyesatkan|tidak benar|\bsalah\b|\bpalsu\b/i.test(title)) {
    return 'HOAKS / DISINFORMASI';
  }
  if (/klarifikasi|bantah|tegaskan|tegas|pastikan|tidak ada|tak ada/i.test(title)) return 'KLARIFIKASI / BANTAHAN';
  if (/cek fakta|cekfakta|benarkah|fakta/i.test(title)) return 'CEK FAKTA';
  return 'BERITA TERKAIT';
}

function parseRss(xml: string, keywords: string[]): RawArticle[] {
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
    // Google News appends " - Publisher" to the headline; drop it for display.
    const title = fullTitle.replace(new RegExp(`\\s+-\\s+${publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim();

    const lower = title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
    const matched = keywords.filter(k => lower.includes(k)).length;
    const overlap = keywords.length ? matched / keywords.length : 0;

    let score = overlap * 10;
    if (FACTCHECK_TERMS.test(title)) score += 3;
    if (TRUSTED_PUBLISHERS.test(publisher) || TRUSTED_PUBLISHERS.test(link)) score += 2;

    const pub = get('pubDate');
    let date: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    }

    const minMatch = Math.min(keywords.length, Math.max(2, Math.ceil(keywords.length / 2)));
    out.push({ title, publisher, date, link, score: matched < minMatch ? -1 : score });
  }
  return out;
}

async function fetchNews(query: string, keywords: string[]): Promise<RawArticle[]> {
  const url = `https://news.google.com/rss/search?hl=id&gl=ID&ceid=ID:id&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'id-ID,id;q=0.9' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), keywords);
  } catch {
    return [];
  }
}

export async function searchFactCheckSources(
  claimText: string,
  _postUrl?: string | null
): Promise<FactCheckResult> {
  // Normalise stylised Unicode (e.g. mathematical bold "𝐑𝐄𝐀𝐋 𝐌𝐀𝐃𝐑𝐈𝐃") to plain letters so keywords and queries are searchable.
  claimText = (claimText || '').normalize('NFKC');
  const heuristic = extractKeywords(claimText, 8);
  const key = heuristic.join(' ');

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  // 1. PRIMARY ENGINE: Google AI Overviews ("Ringkasan AI") via browser automation
  try {
    const aio = await fetchGoogleAiOverview(claimText);
    if (aio.success && aio.sources.length >= 3) {
      console.log(`[Threadibility] Berhasil mengekstrak ${aio.sources.length} rujukan dari Google AI Overview.`);
      let summaryContext = aio.summaryText ? `[Ringkasan Google AI Overview]:\n${aio.summaryText}\n\n[Daftar Rujukan Google]:\n` : '';
      summaryContext += aio.sources
        .map((s, i) => `${i + 1}. [${s.publisher}] "${s.title}" - ${s.verdict}`)
        .join('\n');

      const value: FactCheckResult = {
        query: `${claimText.slice(0, 50)} (Google AI Overview)`,
        sources: aio.sources.slice(0, 6),
        summaryContext
      };
      cache.set(key, { at: Date.now(), value });
      return value;
    }
  } catch (err) {
    console.warn('[Threadibility] Google AI Overview gagal, beralih ke pencarian berita RSS:', err);
  }

  // 2. SECONDARY / FALLBACK ENGINE: Google News RSS Search
  const aiQueries = await generateQueriesWithLLM(claimText);

  // Keywords used to judge article relevance: from AI queries (typo-corrected) when available,
  // otherwise from the raw post text. Fact-check wording itself is not a topic keyword.
  const NOT_TOPIC = new Set(['cek', 'fakta', 'hoaks', 'hoax', 'bantahan', 'klarifikasi', 'berita']);
  const aiKeywords = Array.from(
    new Set(aiQueries.flatMap(q => extractKeywords(q, 12)).filter(w => !NOT_TOPIC.has(w)))
  );
  // Core topic keywords come from the first AI query (entity + event); an article must match at
  // least half of them to count as relevant. Fall back to all AI keywords, then raw text keywords.
  const coreKeywords = aiQueries.length
    ? extractKeywords(aiQueries[0], 8).filter(w => !NOT_TOPIC.has(w))
    : [];
  const keywords = coreKeywords.length >= 2 ? coreKeywords : aiKeywords.length >= 2 ? aiKeywords : heuristic;

  const core = (coreKeywords.length >= 2 ? coreKeywords : heuristic).slice(0, 6).join(' ');
  const fallbackQueries = [`${core} cek fakta`, `${core} hoaks`, heuristic.slice(0, 4).join(' ')];
  const queries = Array.from(new Set([...aiQueries, ...fallbackQueries].filter(q => q.trim().length > 0)));

  let batches = await Promise.all(queries.map(q => fetchNews(q, keywords)));

  // Too few hits (rare wording)? broaden with the most important keywords only.
  const countUnique = (bs: RawArticle[][]) => new Set(bs.flat().filter(a => a.score >= 0).map(a => a.link)).size;
  if (countUnique(batches) < 5 && keywords.length > 2) {
    const broad = keywords.slice(0, 3).join(' ');
    const extra = await Promise.all([fetchNews(`${broad} cek fakta`, keywords), fetchNews(broad, keywords)]);
    batches = batches.concat(extra);
  }

  // Merge, dedupe (by link and by normalised title), rank.
  const seen = new Set<string>();
  const merged: RawArticle[] = [];
  for (const a of batches.flat()) {
    const titleKey = a.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (seen.has(a.link) || seen.has(titleKey)) continue;
    seen.add(a.link);
    seen.add(titleKey);
    merged.push(a);
  }

  // Only genuinely relevant articles (>= 2 topic keywords) are kept; weak matches are never shown.
  const ranked = merged.filter(a => a.score >= 0).sort((a, b) => b.score - a.score);

  // Prefer a spread of publishers: at most 2 articles per publisher in the top results.
  const perPublisher = new Map<string, number>();
  const picked: RawArticle[] = [];
  for (const a of ranked) {
    const n = perPublisher.get(a.publisher) || 0;
    if (n >= 2) continue;
    perPublisher.set(a.publisher, n + 1);
    picked.push(a);
    if (picked.length >= 8) break;
  }
  for (const a of ranked) {
    if (picked.length >= 5) break;
    if (!picked.includes(a)) picked.push(a);
  }

  const sources: FactCheckSource[] = picked.map(a => ({
    publisher: a.publisher,
    title: a.title,
    verdict: verdictLabel(a.title),
    reviewDate: a.date,
    sourceUrl: a.link
  }));

  // Absolute last resort (offline / blocked): topic-specific search pages, never bare homepages.
  const q = encodeURIComponent(`${core} cek fakta`);
  const topicPages: FactCheckSource[] = [
    { publisher: 'Google News', title: `Pencarian berita: ${core} cek fakta`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://news.google.com/search?q=${q}&hl=id&gl=ID&ceid=ID:id` },
    { publisher: 'Google', title: `Pencarian web: ${core} hoaks`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${core} hoaks`)}` },
    { publisher: 'TurnBackHoax (Mafindo)', title: `Cari "${core}" di TurnBackHoax`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://turnbackhoax.id/?s=${encodeURIComponent(core)}` },
    { publisher: 'Kompas.com', title: `Cari "${core}" di Kompas Cek Fakta`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://search.kompas.com/search?q=${encodeURIComponent(`${core} cek fakta`)}` },
    { publisher: 'Tempo.co', title: `Cari "${core}" di Tempo`, verdict: 'PENCARIAN TOPIK', reviewDate: null, sourceUrl: `https://www.tempo.co/search?q=${encodeURIComponent(`${core} cek fakta`)}` }
  ];
  for (const p of topicPages) {
    if (sources.length >= 5) break;
    sources.push(p);
  }

  const relevantCount = picked.length;
  const summaryContext =
    relevantCount === 0
      ? 'TIDAK ADA artikel yang relevan ditemukan untuk klaim ini. Ketiadaan artikel BUKAN bukti bahwa klaim palsu; nilai klaim berdasarkan kewajaran dan pengetahuan Anda, dan turunkan confidence.'
      : sources
          .slice(0, relevantCount)
          .map(
            (s, i) =>
              `${i + 1}. [${s.publisher}] "${s.title}"${s.reviewDate ? ` (${s.reviewDate})` : ''} - ${s.verdict}`
          )
          .join('\n');

  const value: FactCheckResult = { query: `${core} cek fakta`, sources, summaryContext };
  if (relevantCount > 0) cache.set(key, { at: Date.now(), value });
  return value;
}
