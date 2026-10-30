import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FactCheckSource } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOOGLE_PROFILE_DIR = path.resolve(__dirname, '../../data/google-profile');

export interface GoogleAioResult {
  summaryText: string;
  sources: FactCheckSource[];
  success: boolean;
}

const STOPWORDS = new Set([
  'yang', 'dan', 'ini', 'itu', 'pada', 'untuk', 'dari', 'bisa', 'akan', 'dengan', 'adalah', 'atau',
  'juga', 'dalam', 'karena', 'sudah', 'telah', 'oleh', 'saya', 'kita', 'kami', 'mereka', 'nya',
  'ada', 'tidak', 'tak', 'ke', 'di', 'yg', 'dgn', 'sih', 'dong', 'deh', 'lah', 'kok', 'lagi',
  'ingin', 'mau', 'jadi', 'para', 'sebuah', 'agar', 'supaya', 'sangat', 'banget', 'aja', 'saja',
  'setelah', 'sebelum', 'ketika', 'saat', 'bahwa', 'sebagai', 'ya', 'si', 'nih', 'tuh', 'pun',
  'http', 'https', 'www', 'com', 'info', 'valid', 'viral', 'breaking', 'kabarnya', 'ketar', 'ketir',
  'makanya', 'workssss', 'it', 'kawal', 'warga', 'jaga', 'hari', 'pagi', 'siang', 'malam',
  'konten', 'kreator', 'sampaikan', 'permintaan', 'melalui', 'terkait', 'soal', 'baru', 'verified',
  'verifiedbaru', 'bolak', 'balik', 'diatas', 'udara', 'lanjutkan', 'acara', 'hotel', 'kamis',
  'senin', 'selasa', 'rabu', 'jumat', 'sabtu', 'minggu',
  'demi', 'ikut', 'rela', 'salah', 'satu', 'dua', 'tiga', 'meninggalkan', 'membuat', 'menjadi',
  'seorang', 'beberapa', 'banyak', 'semua', 'punya', 'kasih', 'bilang', 'kata', 'anak', 'orang',
  'cuma', 'hanya', 'atas', 'bawah', 'depan', 'belakang', 'antara'
]);

const AIO_META_WORDS = new Set([
  'pernyataan', 'tersebut', 'merupakan', 'bentuk', 'sindiran', 'lelucon', 'satir', 'satire',
  'parodi', 'belaka', 'narasi', 'mengenai', 'kalimat', 'media', 'sosial', 'seperti', 'threads',
  'instagram', 'facebook', 'youtube', 'tiktok', 'warganet', 'netizen', 'ungkapan', 'unggah',
  'unggahan', 'beredar', 'ramai', 'konteks', 'balik', 'fakta', 'sebenarnya', 'meliputi', 'berikut',
  'rincian', 'poin', 'penting', 'adalah', 'hoaks', 'hoax', 'disinformasi', 'misinformasi',
  'candaan', 'sarkas', 'sarkasme', 'hiperbola', 'hiperbolik', 'ejekan', 'konyol', 'sekelas',
  'hanya', 'hadir', 'terjadi', 'kejadian', 'asli', 'merespons', 'menanggapi', 'kehebohan',
  'seputar', 'momen', 'pasca', 'peringatan', 'informasi', 'kabar', 'berita', 'klaim', 'status'
]);

export function extractClaimKeywords(claimText: string, max = 14): string[] {
  const cleaned = (claimText || '')
    .normalize('NFKC')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[\w.]+/g, ' ')
    .replace(/\bverified(\s*baru\s*saja)?\b/gi, ' ')
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/\(di\)sumpah\(in\)/gi, 'sumpah')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase();

  const words = cleaned
    .split(/\s+/)
    .filter(w => (w.length > 2 || /^\d{4}$/.test(w) || w === 'hi') && !STOPWORDS.has(w));

  return Array.from(new Set(words)).slice(0, max);
}

export function extractFactualContextFromAio(aioSummary: string, claimKeywords: string[]): string[] {
  if (!aioSummary) return [];

  // Fokus pada bagian penjelasan fakta/konteks di dalam Ringkasan AI jika ada pemisah eksplisit
  let targetSection = aioSummary;
  const contextMatch = aioSummary.match(/(?:merespons kejadian asli|konteks di balik|fakta sebenarnya|fakta terkait|rincian faktanya|berikut adalah fakta)[\s\S]*/i);
  if (contextMatch && contextMatch[0].length > 40) {
    targetSection = contextMatch[0];
  }

  const words = targetSection
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => (w.length > 2 || /^\d{4}$/.test(w) || w === 'hi') && !STOPWORDS.has(w) && !AIO_META_WORDS.has(w));

  const unique = Array.from(new Set(words));
  return unique.slice(0, 14);
}

function buildCleanSentence(claimText: string): string {
  return (claimText || '')
    .normalize('NFKC')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[\w.]+/g, ' ')
    .replace(/\bverified(\s*baru\s*saja)?\b/gi, ' ')
    .replace(/\b(info\s*valid|breaking\s*news)\b[.:!]*/gi, ' ')
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s(),."'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)
    .trim();
}

function buildSearchQueries(claimText: string): string[] {
  const queries: string[] = [];
  const cleanSentence = buildCleanSentence(claimText);
  if (cleanSentence.length >= 15) {
    queries.push(`${cleanSentence} hoaks fakta`);
  }
  const unique = extractClaimKeywords(claimText, 14);
  if (unique.length > 0) {
    const baseTopic = unique.join(' ');
    queries.push(`${baseTopic} cek fakta`);
  }
  return Array.from(new Set(queries));
}

export function isSummaryIndicatingHoaxOrSatire(summary: string): boolean {
  if (!summary) return false;
  const firstPart = summary.slice(0, 320).toLowerCase();
  if (/\b(adalah fakta|bukan hoaks|bukan hoax|benar telah|memang benar|resmi menyampaikan|terkonfirmasi benar)\b/i.test(firstPart)) {
    return false;
  }
  const cleaned = summary.replace(/\b(bukan|tidak\s+terindikasi)\s+(hoaks|hoax|disinformasi|misinformasi|berita\s+bohong|palsu)\b/gi, '');
  return /\b(hoaks|hoax|disinformasi|misinformasi|tidak benar|tidak sepenuhnya benar|keliru|menyesatkan|sindiran|satir|satire|parodi|lelucon|candaan|sarkas|sarkasme|hiperbolik)\b/i.test(cleaned);
}

function detectVerdict(title: string, summary: string): string {
  const lowerTitle = (title || '').toLowerCase();
  const isHoaxSummary = isSummaryIndicatingHoaxOrSatire(summary);

  if (/\b(hoaks|hoax|disinformasi|misinformasi)\b|\[(salah|hoaks|keliru)\]|cek fakta.*(keliru|salah|tidak benar|menyesatkan|palsu)/i.test(lowerTitle)) {
    return 'HOAKS / DISINFORMASI';
  }
  if (/cek fakta|cekfakta|benarkah/i.test(lowerTitle)) {
    return 'CEK FAKTA';
  }
  if (/klarifikasi|bantah|tegaskan|tegas|minta maaf|permintaan maaf|buka suara|sorotan/i.test(lowerTitle)) {
    return isHoaxSummary ? 'KLARIFIKASI / BANTAHAN' : 'KLARIFIKASI / FAKTA';
  }
  if (isHoaxSummary) {
    return 'FAKTA PEMBANDING';
  }
  return 'FAKTA / TERVERIFIKASI';
}

export async function resolveGotoUrl(gotoUrl: string): Promise<string> {
  if (!gotoUrl || !gotoUrl.includes('/goto')) return gotoUrl;
  try {
    const res = await fetch(gotoUrl, { redirect: 'manual', signal: AbortSignal.timeout(3500) });
    const loc = res.headers.get('location');
    if (loc && loc.startsWith('http')) return loc;
  } catch {}
  return '';
}

function formatPublisher(url: string, rawName: string): string {
  if (url && url.startsWith('http')) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      if (host.includes('kompas.com')) return 'Kompas.com';
      if (host.includes('kompas.tv')) return 'Kompas TV';
      if (host.includes('kompas.id')) return 'Kompas.id';
      if (host.includes('cnnindonesia.com')) return 'CNN Indonesia';
      if (host.includes('detik.com')) return 'detikcom';
      if (host.includes('suara.com')) return 'Suara.com';
      if (host.includes('tempo.co')) return 'Tempo.co';
      if (host.includes('antaranews.com')) return 'Antara News';
      if (host.includes('turnbackhoax.id')) return 'TurnBackHoax (Mafindo)';
      if (host.includes('liputan6.com')) return 'Liputan6.com';
      if (host.includes('tribunnews.com')) return 'Tribunnews';
      if (host.includes('kumparan.com')) return 'Kumparan';
      if (host.includes('tirto.id')) return 'Tirto.id';
      if (host.includes('mashable.com')) return 'Mashable Indonesia';
      if (host.includes('detak.co')) return 'Detak.co';
      if (host.includes('jurnas.com')) return 'Jurnas.com';
      if (host.includes('kontan.co.id')) return 'Kontan';
      if (host.includes('bisnis.com')) return 'Bisnis.com';
      if (host.includes('republika.co.id')) return 'Republika';
      if (host.includes('jawapos.com')) return 'Jawa Pos';
      if (host.includes('merdeka.com')) return 'Merdeka.com';
      if (host.includes('sindonews.com')) return 'Sindonews';
      if (host.includes('viva.co.id')) return 'VIVA.co.id';
      if (host.includes('tvonenews.com')) return 'tvOneNews';
      if (host.includes('inews.id')) return 'iNews.id';
      if (host.includes('medcom.id')) return 'Medcom.id';
      if (host.includes('idntimes.com')) return 'IDN Times';
      if (host.includes('setneg.go.id') || host.includes('presidenri.go.id')) return 'Sekretariat Presiden RI';
      if (host.includes('tni.mil.id') || host.includes('kemhan.go.id') || host.includes('idu.ac.id')) return 'Kemhan / Unhan RI';
      if (host.includes('polri.go.id')) return 'Div Humas Polri';
      if (!host.includes('google.') && !host.includes('goto')) {
        return host.charAt(0).toUpperCase() + host.slice(1);
      }
    } catch {}
  }
  if (rawName && rawName.length < 35 && !/^\d+([:.]\d+)?$/i.test(rawName)) {
    return rawName.replace(/^www\./, '').split('›')[0].trim();
  }
  return 'Portal Berita Resmi';
}

function titleFromUrlSlug(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    const clean = last.replace(/\.[a-zA-Z0-9]+$/, '').replace(/^[0-9_-]+/, '');
    if (clean.length > 15 && clean.includes('-')) {
      const words = clean.split('-').map(w => {
        const lower = w.toLowerCase();
        if (['tni', 'polri', 'ri', 'dpr', 'mpr', 'kpk', 'uu', 'pp', 'pns', 'hi', 'unj', 'ubsi'].includes(lower)) {
          return lower.toUpperCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(' ');
      return words;
    }
  } catch {}
  return '';
}

function cleanAiSummaryText(raw: string): string {
  if (!raw) return '';
  if (
    /tidak tersedia untuk penelusuran ini|tidak dapat membuat ringkasan dengan ai|an ai overview is not available|can't generate an ai overview/i.test(raw) ||
    /:root\s*\{|\.[a-zA-Z0-9_-]+\s*\{display:/i.test(raw)
  ) {
    return '';
  }

  let text = raw
    .replace(/^Ringkasan AI\s*/i, '')
    .replace(/^AI Overview\s*/i, '')
    .replace(/^Balasan Mode AI untuk[^\n]*\n?/i, '')
    .replace(/\nJika (Anda |ada )?(ingin|memerlukan|membutuhkan|informasi)[\s\S]*$/i, '')
    .replace(/\nApakah (Anda ingin|Anda sedang|ada informasi lain)[\s\S]*$/i, '')
    .replace(/\nBerikut adalah video berita[\s\S]*$/i, '')
    .replace(/\nTampilkan semua[\s\S]*$/i, '')
    .replace(/\nBeri masukan[\s\S]*$/i, '')
    .replace(/\nPelajari lebih lanjut[\s\S]*$/i, '');

  const cardBlockMatch = text.match(/\n[^\n]{2,50}\n[^\n]{15,120}\n\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+\d{4}\s+—/i);
  if (cardBlockMatch && cardBlockMatch.index && cardBlockMatch.index > 80) {
    text = text.slice(0, cardBlockMatch.index);
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cleanedLines: string[] = [];

  const BADGE_NAMES = /^(Kompas\.com|detikcom|Suara\.com|Tempo\.co|Antara News|Tribunnews|TribunStyle\.com|Liputan6\.com|CNN Indonesia|Kumparan|Tirto\.id|Republika|Mashable Indonesia|CekFakta|YouTube|Instagram|Facebook|TikTok|X|Threads)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    if (/^\+\d+$/.test(line)) continue;
    if (/^[·•]/.test(line)) continue;
    if (/^\d{1,2}:\d{2}$/.test(line)) continue;
    if (/\b(rb tampilan|jam yang lalu|hari yang lalu|menit yang lalu|suka\s*·)\b/i.test(line)) continue;
    if (/^\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+\d{4}\s+—/i.test(line)) continue;

    if (BADGE_NAMES.test(line) || (line.length < 28 && (/^\+\d+$/.test(nextLine) || /^[·•]/.test(nextLine)))) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Searches Google using an off-screen Chrome instance to extract
 * Google AI Overviews ("Ringkasan AI") and exact referenced article sources.
 */
export async function fetchGoogleAiOverview(claimText: string): Promise<GoogleAioResult> {
  const queries = buildSearchQueries(claimText);
  if (queries.length === 0) {
    return { summaryText: '', sources: [], success: false };
  }

  const claimKeywords = extractClaimKeywords(claimText, 14);

  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(GOOGLE_PROFILE_DIR, {
      channel: 'chrome',
      headless: false,
      locale: 'id-ID',
      viewport: { width: 1280, height: 800 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--window-position=-3000,-3000'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    let finalSummaryText = '';
    let collectedRawSources: { href: string; title: string; rawPublisher: string; date: string | null }[] = [];

    for (const searchQuery of queries) {
      console.log(`[Google AI Overview] Menelusuri topik Google: "${searchQuery}"`);
      const searchUrl = `https://www.google.com/search?hl=id&gl=id&q=${encodeURIComponent(searchQuery)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForTimeout(4000);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button, span'));
        for (const b of btns) {
          const t = (b as HTMLElement).innerText?.trim();
          if (t === 'Tampilkan semua' || t === 'Show all') {
            (b as HTMLElement).click();
            break;
          }
        }
        window.scrollBy(0, 500);
      }).catch(() => {});
      await page.waitForTimeout(600);

      const pageData = await page.evaluate(() => {
        let rawOverviewText = '';
        let overviewContainer: HTMLElement | null = null;
        const allElements = document.querySelectorAll('div, h2, span');

        for (const el of allElements) {
          const htmlEl = el as HTMLElement;
          const txt = htmlEl.innerText?.trim();
          if (txt === 'Ringkasan AI' || txt === 'AI Overview') {
            const container = el.closest('div[jscontroller], div[data-attrid], div[class*="MjjYud"]') as HTMLElement | null;
            if (container && container.innerText) {
              const cText = container.innerText.trim();
              if (
                cText.length >= 60 &&
                !/tidak tersedia untuk penelusuran ini|tidak dapat membuat ringkasan dengan ai|an ai overview is not available/i.test(cText) &&
                !/:root\s*\{|\.[a-zA-Z0-9_-]+\s*\{display:/i.test(cText)
              ) {
                overviewContainer = container;
                rawOverviewText = cText;
                break;
              }
            }
          }
        }

        const sourceMap = new Map<string, { href: string; title: string; rawPublisher: string; date: string | null }>();
        const candidates: { href: string; title: string; pub: string; date: string | null }[] = [];

        if (overviewContainer) {
          const aioLinks = Array.from(overviewContainer.querySelectorAll('a[href*="/goto"], a[href*="http"]')) as HTMLAnchorElement[];
          for (const a of aioLinks) {
            const aria = (a.getAttribute('aria-label') || '').trim();
            const inner = (a.innerText || '').trim();
            const h3Text = (a.querySelector('h3')?.innerText || '').trim();

            let card: HTMLElement | null = a;
            while (card && card !== overviewContainer && (!card.innerText || card.innerText.length < 25)) {
              card = card.parentElement;
            }
            const cardText = card ? card.innerText || '' : inner;
            const dateMatch = cardText.match(/(\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
            const date = dateMatch ? dateMatch[1] : null;

            const bestTitle = h3Text.length >= 15 ? h3Text : (aria.length >= 20 ? aria : '');
            const bestPub = inner.length > 1 && inner.length < 35 && !/^\d/.test(inner)
              ? inner.split('\n')[0]
              : (aria.length > 1 && aria.length < 35 ? aria : '');

            candidates.push({ href: a.href, title: bestTitle, pub: bestPub, date });
          }
        }

        const headings = document.querySelectorAll('h3');
        for (const h3 of headings) {
          const title = (h3 as HTMLElement).innerText?.trim() || '';
          if (!title || title.length < 15) continue;
          const a = h3.closest('a') as HTMLAnchorElement | null;
          if (!a || !a.href) continue;
          const parent = a.parentElement || a;
          const cite = (parent.querySelector('cite') as HTMLElement | null)?.innerText?.trim() || '';
          candidates.push({
            href: a.href,
            title,
            pub: cite ? cite.split('›')[0].trim() : '',
            date: null
          });
        }

        for (const c of candidates) {
          if (!c.href || c.href.includes('google.com/search') || c.href.includes('policies.google')) continue;
          const cleanTitle = (c.title || '').replace(/\s+/g, ' ').trim();
          const cleanPub = (c.pub || '').replace(/^[·•+]\s*/, '').replace(/\s+/g, ' ').trim();

          if (/^\d{1,2}:\d{2}$/.test(cleanTitle)) continue;
          if (/-\s*\d+\s*(detik|menit)\b/i.test(cleanTitle)) continue;
          if (/\d+\+?\s*(suka|like|komentar|rb tampilan)/i.test(cleanTitle)) continue;

          const existing = sourceMap.get(c.href);
          if (!existing) {
            sourceMap.set(c.href, {
              href: c.href,
              title: cleanTitle.length >= 15 ? cleanTitle : '',
              rawPublisher: cleanPub.length > 0 && cleanPub.length < 35 ? cleanPub : (cleanTitle.length < 35 ? cleanTitle : ''),
              date: c.date
            });
          } else {
            if (cleanTitle.length > existing.title.length && cleanTitle.length >= 15) {
              existing.title = cleanTitle;
            }
            if (!existing.rawPublisher && cleanPub.length > 0 && cleanPub.length < 35) {
              existing.rawPublisher = cleanPub;
            }
            if (!existing.date && c.date) {
              existing.date = c.date;
            }
          }
        }

        return {
          rawOverviewText,
          rawSources: Array.from(sourceMap.values())
        };
      });

      const cleanedSummary = cleanAiSummaryText(pageData.rawOverviewText);
      if (pageData.rawSources.length > 0) {
        collectedRawSources = [...collectedRawSources, ...pageData.rawSources];
      }
      if (cleanedSummary && cleanedSummary.length >= 40) {
        finalSummaryText = cleanedSummary;
        break;
      }
    }

    // Ekstrak kata kunci konteks faktual dari penjelasan Google AI Overview
    const aioFactKeywords = extractFactualContextFromAio(finalSummaryText, claimKeywords);
    const allContextKeywords = Array.from(new Set([...claimKeywords, ...aioFactKeywords]));

    const currentDate = new Date().toISOString().split('T')[0];
    const byUrl = new Map<string, FactCheckSource>();
    const SOCIAL_DOMAINS = /instagram\.com|youtube\.com|tiktok\.com|facebook\.com|x\.com|twitter\.com|threads\.net|threads\.com/i;
    const EXCLUDE_DOMAINS = /wikipedia\.org|wiktionary\.org|wikimedia\.org|policies\.google|google\.com\/(search|travel|maps|intl|setprefs|goto)/i;

    const resolvedItems = await Promise.all(
      collectedRawSources.map(async item => ({
        item,
        realUrl: await resolveGotoUrl(item.href)
      }))
    );

    for (const { item, realUrl } of resolvedItems) {
      if (
        !realUrl ||
        !realUrl.startsWith('http') ||
        EXCLUDE_DOMAINS.test(realUrl) ||
        SOCIAL_DOMAINS.test(realUrl) ||
        realUrl.includes('/image/')
      ) {
        continue;
      }

      const pub = formatPublisher(realUrl, item.rawPublisher);
      let title = item.title;
      const slugTitle = titleFromUrlSlug(realUrl);

      if ((!title || title.length < 15 || title.endsWith('...')) && slugTitle && slugTitle.length >= 20) {
        title = slugTitle;
      }
      if (!title || title.length < 12) continue;

      if (/\d+\+?\s*(suka|like|komentar|jam yang lalu|hari yang lalu)/i.test(title)) {
        continue;
      }

      const combinedLower = `${title} ${realUrl}`.normalize('NFKD').toLowerCase();
      const matchedClaim = claimKeywords.filter(k => combinedLower.includes(k));
      const matchedAioFact = aioFactKeywords.filter(k => combinedLower.includes(k));
      const totalMatched = allContextKeywords.filter(k => combinedLower.includes(k));

      // Wajib mencocokkan minimal salah satu dari 2 kata kunci topik utama di awal klaim
      const hasLeadAnchor = claimKeywords.slice(0, 2).some(k => combinedLower.includes(k));
      if (!hasLeadAnchor || totalMatched.length < 2) {
        continue;
      }

      // Pastikan artikel relevan dengan konteks peristiwa (baik dari klaim maupun dari fakta sebenarnya di AI Overview)
      if (claimKeywords.length >= 6 && matchedAioFact.length < 2) {
        const contextWords = claimKeywords.slice(2);
        const hasContextMatch = contextWords.some(k => combinedLower.includes(k));
        if (!hasContextMatch && matchedClaim.length < 3) {
          continue;
        }
      }

      const existing = byUrl.get(realUrl);
      if (!existing) {
        byUrl.set(realUrl, {
          publisher: pub,
          title,
          verdict: detectVerdict(title, finalSummaryText),
          reviewDate: item.date || currentDate,
          sourceUrl: realUrl
        });
      } else if (title.length > (existing.title?.length || 0) && !title.endsWith('...')) {
        existing.title = title;
      }
    }

    const sources = Array.from(byUrl.values()).slice(0, 6);
    const hasAiSummary = Boolean(finalSummaryText && finalSummaryText.length >= 40);

    return {
      summaryText: finalSummaryText,
      sources,
      success: hasAiSummary
    };
  } catch (error) {
    console.warn('[Google AI Overview] Gagal mengekstrak AI Overview:', error);
    return { summaryText: '', sources: [], success: false };
  } finally {
    if (ctx) {
      await ctx.close().catch(() => {});
    }
  }
}
