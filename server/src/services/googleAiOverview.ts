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
  'makanya', 'workssss', 'it', 'kawal', 'warga', 'jaga', 'hari', 'pagi', 'siang', 'malam'
]);

function buildSearchTopic(claimText: string): string {
  const words = (claimText || '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOPWORDS.has(w));

  const unique = Array.from(new Set(words)).slice(0, 7);
  if (unique.length === 0) return claimText.slice(0, 60);
  return `${unique.join(' ')} cek fakta`;
}

function detectVerdict(title: string, summary: string): string {
  const combined = `${title} ${summary}`.toLowerCase();
  if (/hoaks|hoax|disinformasi|misinformasi|keliru|menyesatkan|tidak benar|\bsalah\b|\bpalsu\b/i.test(combined)) {
    return 'HOAKS / DISINFORMASI';
  }
  if (/klarifikasi|bantah|tegaskan|tegas|tidak ada niat|tidak berminat|tidak bisa/i.test(combined)) {
    return 'KLARIFIKASI / BANTAHAN';
  }
  if (/cek fakta|cekfakta|benarkah|fakta/i.test(combined)) {
    return 'CEK FAKTA';
  }
  if (/resmi|official|terverifikasi|fakta/i.test(combined)) {
    return 'FAKTA / TERVERIFIKASI';
  }
  return 'BERITA TERKAIT';
}

function cleanPublisher(raw: string, cite: string, url: string): string {
  // 1. Ekstrak nama domain dari URL asli (paling akurat)
  if (url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host && !host.includes('google.') && !host.includes('goto')) {
        return host;
      }
    } catch {}
  }

  // 2. Gunakan breadcrumb cite jika bukan metrik engagement
  if (cite) {
    try {
      const match = cite.match(/https?:\/\/([^\s›/]+)/);
      if (match && match[1]) {
        return match[1].replace(/^www\./, '');
      }
      const part = cite.split('›')[0].trim();
      if (part && !/^\d+([:.]\d+)?(\s*(suka|like|komentar|minggu|hari|jam|bulan))?$/i.test(part)) {
        return part.replace(/^www\./, '');
      }
    } catch {}
  }

  // 3. Fallback teks publisher jika tidak menyerupai angka/komentar/durasi
  if (
    raw &&
    raw.length < 40 &&
    !raw.startsWith('http') &&
    !/^\d+([:.]\d+)?$/i.test(raw) &&
    !/\d+\s*(suka|like|komentar|minggu|hari|jam)/i.test(raw)
  ) {
    return raw.replace(/https?:\/\//, '').split('›')[0].trim();
  }

  return 'Rujukan Cek Fakta';
}

/**
 * Searches Google using an off-screen Chrome instance to extract
 * Google AI Overviews ("Ringkasan AI") and exact referenced article sources.
 */
export async function fetchGoogleAiOverview(claimText: string): Promise<GoogleAioResult> {
  const searchQuery = buildSearchTopic(claimText);
  if (!searchQuery) {
    return { summaryText: '', sources: [], success: false };
  }

  console.log(`[Google AI Overview] Menelusuri topik Google: "${searchQuery}"`);

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
        '--window-position=-3000,-3000' // completely off-screen
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const searchUrl = `https://www.google.com/search?hl=id&gl=id&q=${encodeURIComponent(searchQuery)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    
    // Wait briefly for AI Overview container to render
    await page.waitForTimeout(3500);

    const data = await page.evaluate(() => {
      // 1. Extract Google AI Overview (Ringkasan AI) text
      let summaryText = '';
      let overviewContainer: HTMLElement | null = null;
      const allDivs = document.querySelectorAll('div, h2, span');
      for (const el of allDivs) {
        const htmlEl = el as HTMLElement;
        const txt = htmlEl.innerText?.trim() || htmlEl.textContent?.trim();
        if (txt === 'Ringkasan AI' || txt === 'AI Overview') {
          const container = el.closest('div[jscontroller], div[data-attrid], div[class*="MjjYud"]') as HTMLElement | null;
          if (container) {
            overviewContainer = container;
            summaryText = container.innerText?.trim() || container.textContent?.trim() || '';
            break;
          }
        }
      }

      // Bersihkan teks Ringkasan AI dari tombol navigasi/footer Google
      if (summaryText) {
        summaryText = summaryText
          .replace(/^Ringkasan AI\s*/i, '')
          .replace(/\nTampilkan semua[\s\S]*$/i, '')
          .replace(/\nBeri masukan[\s\S]*$/i, '')
          .trim();
      }

      // 2. Extract article sources
      const rawList: { title: string; publisher: string; url: string; cite: string }[] = [];
      const IGNORE_PATTERNS = /google\.com\/(search|travel|maps|intl|setprefs|preferences|policies)|penerbangan|kebijakan privasi|persyaratan|masuk|login|terjemahkan|bantuan|alat penelusuran|setelan/i;

      // 2a. Ekstrak kartu rujukan Google AI Overview (link goto atau link kartu di dalam AI overview)
      if (overviewContainer) {
        const aioLinks = overviewContainer.querySelectorAll('a[href*="/goto"], a[href*="http"]');
        for (const a of aioLinks) {
          const url = (a as HTMLAnchorElement).href;
          if (!url || IGNORE_PATTERNS.test(url) || url.includes('google.com/search')) continue;

          const parent = a.closest('div') || a;
          const parentTxt = (parent as HTMLElement).innerText?.trim() || '';
          const lines = parentTxt.split('\n').map(l => l.trim()).filter(Boolean);

          let title = (a as HTMLElement).innerText?.trim() || lines[0] || '';
          let publisher = '';
          if (lines.length >= 2) {
            publisher = lines[lines.length - 1].replace(/^[·•+]\s*/, '').trim();
          }

          if (title.length >= 5) {
            rawList.push({
              title: title.slice(0, 100),
              publisher: publisher || 'Rujukan Google AI',
              url,
              cite: ''
            });
          }
        }
      }

      // 2b. Ekstrak rujukan berita organik Google (heading h3)
      const headings = document.querySelectorAll('h3');
      for (const h3 of headings) {
        const title = h3.innerText?.trim();
        if (!title || title.length < 8 || IGNORE_PATTERNS.test(title)) continue;

        const a = h3.closest('a');
        if (!a || !a.href || IGNORE_PATTERNS.test(a.href) || a.href.includes('google.com/search')) continue;

        let publisher = '';
        const parent = a.parentElement || a;
        const citeEl = parent.querySelector('cite') || parent.parentElement?.querySelector('cite');
        const cite = citeEl?.innerText?.trim() || '';
        if (cite) {
          publisher = cite.split('›')[0].trim();
        }

        rawList.push({
          title,
          publisher: publisher || 'Portal Berita',
          url: a.href,
          cite
        });
      }

      return { summaryText, rawList };
    });

    const currentDate = new Date().toISOString().split('T')[0];
    const seenTitles = new Set<string>();
    const seenUrls = new Set<string>();
    const sources: FactCheckSource[] = [];

    for (const item of data.rawList) {
      const cleanTitle = item.title.replace(/\s+/g, ' ').trim();
      const normTitle = cleanTitle.toLowerCase().replace(/[^\w]/g, '');
      if (seenTitles.has(normTitle) || seenUrls.has(item.url) || normTitle.length < 5) continue;
      seenTitles.add(normTitle);
      seenUrls.add(item.url);

      const pub = cleanPublisher(item.publisher, item.cite, item.url);
      const verdict = detectVerdict(cleanTitle, data.summaryText);

      sources.push({
        publisher: pub,
        title: cleanTitle,
        verdict,
        reviewDate: currentDate,
        sourceUrl: item.url
      });

      if (sources.length >= 7) break;
    }

    // Google AI Overview dianggap sukses jika ringkasan AI benar-benar ada!
    const hasAiSummary = Boolean(data.summaryText && data.summaryText.length >= 40);

    return {
      summaryText: data.summaryText,
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

