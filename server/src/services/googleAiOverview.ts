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

function cleanPublisher(raw: string, cite: string): string {
  if (cite) {
    try {
      const match = cite.match(/https?:\/\/([^\s›/]+)/);
      if (match && match[1]) {
        const domain = match[1].replace(/^www\./, '');
        return domain;
      }
    } catch {}
  }
  if (raw && raw.length < 50 && !raw.startsWith('http')) {
    return raw.replace(/https?:\/\//, '').split('›')[0].trim();
  }
  return 'Sumber Berita';
}

/**
 * Searches Google using an off-screen Chrome instance to extract
 * Google AI Overviews ("Ringkasan AI") and exact referenced article sources.
 */
export async function fetchGoogleAiOverview(claimText: string): Promise<GoogleAioResult> {
  const norm = (claimText || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s.,?!-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!norm) {
    return { summaryText: '', sources: [], success: false };
  }

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

    const searchUrl = `https://www.google.com/search?hl=id&gl=id&q=${encodeURIComponent(norm)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    
    // Wait briefly for AI Overview container to render
    await page.waitForTimeout(3500);

    const data = await page.evaluate(() => {
      // 1. Extract Google AI Overview (Ringkasan AI) text
      let summaryText = '';
      const allDivs = document.querySelectorAll('div, h2, span');
      for (const el of allDivs) {
        const htmlEl = el as HTMLElement;
        const txt = htmlEl.innerText?.trim() || htmlEl.textContent?.trim();
        if (txt === 'Ringkasan AI' || txt === 'AI Overview') {
          const container = el.closest('div[jscontroller], div[data-attrid], div[class*="MjjYud"]') as HTMLElement | null;
          if (container) {
            summaryText = container.innerText?.trim() || container.textContent?.trim() || '';
            break;
          }
        }
      }

      // 2. Extract article sources
      const rawList = [];
      const IGNORE_PATTERNS = /google\.|penerbangan|kebijakan privasi|persyaratan|masuk|login|terjemahkan|bantuan|alat penelusuran|setelan/i;

      // Extract all h3 results and their direct anchors + cite
      const headings = document.querySelectorAll('h3');
      for (const h3 of headings) {
        const title = h3.innerText?.trim();
        if (!title || title.length < 5 || IGNORE_PATTERNS.test(title)) continue;

        const a = h3.closest('a');
        if (!a || !a.href || a.href.includes('google.com/search') || a.href.includes('policies.google')) {
          continue;
        }

        const parent = a.parentElement || a;
        const citeEl = parent.querySelector('cite') || parent.parentElement?.querySelector('cite');
        const cite = citeEl?.innerText?.trim() || '';

        // Extract publisher name from snippet or cite
        let publisher = '';
        if (cite) {
          publisher = cite.split('›')[0].trim();
        }
        if (!publisher && parent.innerText) {
          const lines = parent.innerText.split('\n').map((l: string) => l.trim()).filter(Boolean);
          if (lines.length >= 2 && lines[1].length < 40 && !lines[1].startsWith('http')) {
            publisher = lines[1];
          }
        }

        rawList.push({
          title,
          publisher: publisher || 'Sumber Berita',
          url: a.href,
          cite
        });
      }

      return { summaryText, rawList };
    });

    const currentDate = new Date().toISOString().split('T')[0];
    const seenTitles = new Set<string>();
    const sources: FactCheckSource[] = [];

    for (const item of data.rawList) {
      const cleanTitle = item.title.replace(/\s+/g, ' ').trim();
      const normTitle = cleanTitle.toLowerCase().replace(/[^\w]/g, '');
      if (seenTitles.has(normTitle) || normTitle.length < 6) continue;
      seenTitles.add(normTitle);

      const pub = cleanPublisher(item.publisher, item.cite);
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

    return {
      summaryText: data.summaryText,
      sources,
      success: sources.length > 0
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
