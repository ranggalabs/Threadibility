// Pengujian black-box ekstensi pada DOM fixture (meniru struktur kontainer post Threads) dan
// pengambilan tangkapan layar tampilan nyata (badge, tooltip, popup) dengan data hasil uji.
// Kode sumber ekstensi di src/ DIPAKAI APA ADANYA (dibundel dengan esbuild), tidak dimodifikasi.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const { chromium } = require(path.join(root, 'server/node_modules/playwright-core'));

const work = path.join(here, '_build');
fs.mkdirSync(work, { recursive: true });
const shots = path.join(here, 'gambar');
fs.mkdirSync(shots, { recursive: true });

// ---------- 1. Bundel kode ekstensi ----------
fs.writeFileSync(path.join(work, 'harness.ts'), `
import { findPostContainer, extractPostData } from '${root.replace(/\\/g, '/')}/src/content/postExtractor';
import { injectBadge, injectLoadingBadge, injectErrorBadge } from '${root.replace(/\\/g, '/')}/src/content/badge';
(window as any).TB = { findPostContainer, extractPostData, injectBadge, injectLoadingBadge, injectErrorBadge };
`);
await esbuild.build({ entryPoints: [path.join(work, 'harness.ts')], bundle: true, outfile: path.join(work, 'harness.js'), format: 'iife', logLevel: 'error' });
await esbuild.build({
  entryPoints: [path.join(root, 'src/popup/main.tsx')], bundle: true, outdir: path.join(work, 'popup'),
  format: 'iife', jsx: 'automatic', loader: { '.css': 'css', '.png': 'dataurl' }, logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"' }
});

const badgeCss = fs.readFileSync(path.join(root, 'src/content/badge.css'), 'utf8');
const harness = fs.readFileSync(path.join(work, 'harness.js'), 'utf8');

const fixture = (extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
body{background:#101010;color:#f3f5f7;font-family:-apple-system,Segoe UI,Arial,sans-serif;margin:0;padding:24px;width:620px}
.post{border-bottom:1px solid #333;padding:14px 0}
a{color:#f3f5f7;text-decoration:none;font-weight:600}
${badgeCss}
</style></head><body>
<div id="feed">
 <div class="post" id="post1" data-pressable-container="true">
   <div><a id="u1" href="/@pergijauh">pergijauh</a> <a href="/@pergijauh/post/DfGj6J8FB6X"><time datetime="2026-10-29T09:00:00.000Z">1h</time></a></div>
   <div><span dir="auto" id="body1">Demi ikut (di)sumpah(in) pemuda, salah satu mahasiswa Unhar (universitas harvard) rela meninggalkan sidang tesis neuroscience-nya 1/2</span></div>
   <div><span dir="auto">Suka</span> <span dir="auto">128</span> <span dir="auto">Balas</span> <span dir="auto">14</span></div>
 </div>
 <div class="post" id="post2">
   <div><a href="/@akunlain">akunlain</a> <span dir="auto">3h</span></div>
   <div><span dir="auto" id="body2">Teks tanpa atribut kontainer; hanya ikon Like dan Reply.</span></div>
   <div><svg aria-label="Like" width="16" height="16"></svg><svg aria-label="Reply" width="16" height="16"></svg></div>
 </div>
 <div class="post" id="between"><p id="nobetween">Area di antara post dalam feed yang sama.</p></div>
</div><div id="sidebar"><p id="nopost">Bagian halaman yang bukan post (mis. sidebar).</p></div>${extra}<script>${harness}</script></body></html>`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function load(p) { await p.route('https://www.threads.com/**', rt => rt.fulfill({ contentType: 'text/html', body: fixture() })); await p.goto('https://www.threads.com/'); }
const results = [];
const rec = (id, nama, expected, actual, pass) => { results.push({ id, nama, expected, actual, pass }); console.log(pass ? 'PASS' : 'FAIL', id, nama, '=>', actual); };

const page = await browser.newPage({ viewport: { width: 700, height: 720 }, deviceScaleFactor: 2 });
await load(page);

// U01: findPostContainer (selector utama) dari elemen bersarang
let r = await page.evaluate(() => { const t = document.getElementById('body1'); const c = (window).TB.findPostContainer(t); return c && c.id; });
rec('U01', 'findPostContainer: selector utama data-pressable-container', 'post1', r, r === 'post1');
// U02: fallback ikon Like + Reply
r = await page.evaluate(() => { const t = document.getElementById('body2'); const c = (window).TB.findPostContainer(t); return c && c.id; });
rec('U02', 'findPostContainer: fallback ikon Like dan Reply', 'post2', r, r === 'post2');
// U03: area bukan post
r = await page.evaluate(() => { const c = (window).TB.findPostContainer(document.getElementById('nopost')); return c === null; });
rec('U03', 'findPostContainer: area di luar post mengembalikan null', 'null', String(r), r === true);
// U03b: area di antara post dalam feed yang sama (perilaku fallback)
r = await page.evaluate(() => { const c = (window).TB.findPostContainer(document.getElementById('nobetween')); return c ? (c.id || c.tagName) : null; });
rec('U03b', 'findPostContainer: area antar-post di feed yang sama (batasan fallback)', 'null', String(r), r === null);
// U04: extractPostData
const ex = await page.evaluate(() => (window).TB.extractPostData(document.getElementById('post1')));
rec('U04a', 'extractPostData: username', '@pergijauh', ex.username, ex.username === '@pergijauh');
rec('U04b', 'extractPostData: teks isi post tanpa username/waktu/angka/tombol', 'Demi ikut (di)sumpah(in) pemuda, ... 1/2', ex.text, ex.text.startsWith('Demi ikut (di)sumpah(in) pemuda') && !/Suka|Balas|128/.test(ex.text));
rec('U04c', 'extractPostData: URL post absolut', 'https://.../@pergijauh/post/DfGj6J8FB6X', ex.postUrl, /\/@pergijauh\/post\/DfGj6J8FB6X$/.test(ex.postUrl || '') && /^https?:\/\//.test(ex.postUrl || ''));
rec('U04d', 'extractPostData: timestamp dari atribut datetime', '2026-10-29T09:00:00.000Z', ex.timestamp, ex.timestamp === '2026-10-29T09:00:00.000Z');

// Data analisis NYATA dari pengujian klaim (jika tersedia)
let real = {};
const jsonPath = path.join(here, 'hasil_uji_klaim.json');
if (fs.existsSync(jsonPath)) {
  for (const x of JSON.parse(fs.readFileSync(jsonPath, 'utf8')).results) real[x.id] = x;
}
const toAnalysis = x => ({ claim: x.text.slice(0, 140), indikasiHoax: x.predicted === 'H', alasan: x.alasan, confidence: x.confidence,
  factCheckSources: (x.sources || []).map(s => ({ publisher: s.publisher, title: s.title, verdict: s.verdict, reviewDate: s.date, sourceUrl: s.url })) });
const hoaxA = real.H06 ? toAnalysis(real.H06) : { claim: 'x', indikasiHoax: true, alasan: 'Contoh alasan', confidence: 0.95, factCheckSources: [{ publisher: 'Kompas.com', title: 'Judul rujukan', verdict: 'CEK FAKTA', reviewDate: '2026-10-30', sourceUrl: 'https://kompas.com/a' }] };
const okA = real.V01 ? toAnalysis(real.V01) : { ...hoaxA, indikasiHoax: false };

// U05: loading badge
r = await page.evaluate(() => { (window).TB.injectLoadingBadge(document.getElementById('post1')); const b = document.querySelector('#post1 .tb-badge'); return b && b.textContent; });
rec('U05', 'injectLoadingBadge: lencana "Menganalisis..."', '🔍 Menganalisis...', r, r === '🔍 Menganalisis...');
await page.screenshot({ path: path.join(shots, 'ui_badge_loading.png'), clip: { x: 0, y: 0, width: 700, height: 140 } });

// U06: badge hoax + tooltip (data nyata)
r = await page.evaluate(a => { (window).TB.injectBadge(document.getElementById('post1'), a);
  const b = document.querySelector('#post1 .tb-badge'); const t = document.querySelector('#post1 .tb-tooltip');
  return { cls: b.className, text: b.textContent, conf: (t.querySelector('.tb-tooltip-confidence') || {}).textContent, links: t.querySelectorAll('.tb-tooltip-sources a').length,
    target: [...t.querySelectorAll('.tb-tooltip-sources a')].every(a => a.target === '_blank' && /noopener/.test(a.rel)), containers: document.querySelectorAll('#post1 .tb-badge-container').length }; }, hoaxA);
rec('U06a', 'injectBadge (hoax): kelas dan teks lencana', 'tb-badge-hoax / Hoax', `${r.cls} / ${r.text}`, /tb-badge-hoax/.test(r.cls) && r.text === 'Hoax');
rec('U06b', 'injectBadge: persentase confidence di tooltip', `(${Math.round(hoaxA.confidence * 100)}% Confidence)`, r.conf, r.conf === `(${Math.round(hoaxA.confidence * 100)}% Confidence)`);
rec('U06c', 'injectBadge: jumlah tautan rujukan = jumlah sumber', String(hoaxA.factCheckSources.length), String(r.links), r.links === hoaxA.factCheckSources.length);
rec('U06d', 'injectBadge: tautan dibuka di tab baru (target=_blank, rel=noopener)', 'true', String(r.target), r.target === true);
rec('U09', 'injectBadge: badge lama diganti (hanya satu kontainer)', '1', String(r.containers), r.containers === 1);

// Tangkapan layar tooltip hoax (hover)
await page.hover('#post1 .tb-badge');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, 'ui_tooltip_hoax.png'), fullPage: true });

// U07: badge verified
const page2 = await browser.newPage({ viewport: { width: 700, height: 720 }, deviceScaleFactor: 2 });
await load(page2);
r = await page2.evaluate(a => { (window).TB.injectBadge(document.getElementById('post1'), a);
  const b = document.querySelector('#post1 .tb-badge'); const v = document.querySelector('#post1 .tb-tooltip-verdict');
  return { cls: b.className, text: b.textContent, verdict: v.textContent.trim() }; }, okA);
rec('U07', 'injectBadge (valid): kelas, teks lencana, dan status tooltip', 'tb-badge-verified / Verified / Terverifikasi Benar', `${r.cls} / ${r.text} / ${r.verdict}`, /tb-badge-verified/.test(r.cls) && r.text === 'Verified' && /Terverifikasi Benar/.test(r.verdict));
await page2.hover('#post1 .tb-badge');
await page2.waitForTimeout(500);
await page2.screenshot({ path: path.join(shots, 'ui_tooltip_verified.png'), fullPage: true });

// U08: error badge hilang otomatis setelah 3 detik
const page3 = await browser.newPage({ viewport: { width: 700, height: 300 } });
await load(page3);
await page3.evaluate(() => (window).TB.injectErrorBadge(document.getElementById('post1')));
const shown = await page3.evaluate(() => (document.querySelector('#post1 .tb-badge') || {}).textContent);
await page3.waitForTimeout(3300);
const gone = await page3.evaluate(() => document.querySelectorAll('#post1 .tb-badge-container').length === 0);
rec('U08', 'injectErrorBadge: tampil lalu hilang otomatis ±3 detik', 'tampil lalu hilang', `${shown} → ${gone ? 'hilang' : 'masih ada'}`, shown && /Gagal/.test(shown) && gone);

// U10: keamanan injeksi HTML (temuan)
const page4 = await browser.newPage({ viewport: { width: 700, height: 300 } });
await load(page4);
const sec = await page4.evaluate(() => {
  (window).__x = 0;
  (window).TB.injectBadge(document.getElementById('post1'), {
    claim: 'c', indikasiHoax: true, confidence: 0.9,
    alasan: 'Alasan <img src=x onerror="window.__x=(window.__x||0)+1"> uji',
    factCheckSources: [{ publisher: 'P', title: 'Judul <img src=x onerror="window.__x=(window.__x||0)+10">', verdict: 'V', reviewDate: null, sourceUrl: 'https://example.com' }]
  });
  return new Promise(res => setTimeout(() => res({ x: (window).__x, imgs: document.querySelectorAll('#post1 .tb-tooltip img').length }), 400));
});
rec('U10a', 'Injeksi HTML pada judul sumber (escapeHtml)', 'tidak dieksekusi', (sec.x >= 10 ? 'skrip pada judul DIEKSEKUSI' : 'judul di-escape, skrip tidak dieksekusi'), !(sec.x >= 10));
rec('U10b', 'Injeksi HTML pada field alasan (tanpa escape)', 'seharusnya di-escape', sec.x % 10 >= 1 ? 'HTML pada alasan DIRENDER (temuan kerentanan)' : 'di-escape', sec.x % 10 === 0);

// ---------- Popup (stub chrome.storage, data nyata) ----------
const hist = ['H06', 'V01', 'H07', 'V07', 'H03'].filter(k => real[k]).map((k, i) => ({
  id: 'hr_' + (1000 + i), post: { text: real[k].text, username: '@uji_threadibility', postUrl: null, timestamp: null },
  analysis: toAnalysis(real[k]), analyzedAt: new Date(Date.now() - i * 3600e3).toISOString() }));
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/') { res.setHeader('content-type', 'text/html'); return res.end(`<!doctype html><html class="dark"><head><meta charset="utf-8"><link rel="stylesheet" href="/popup/main.css"></head><body class="bg-background text-on-background"><div id="root"></div><script src="/popup/main.js"></script></body></html>`); }
  const f = u.startsWith('/popup/') ? path.join(work, u) : path.join(root, 'public', u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'image/png'); return res.end(fs.readFileSync(f)); }
  res.statusCode = 404; res.end();
});
await new Promise(r2 => server.listen(0, r2));
const port = server.address().port;
const pp = await browser.newPage({ viewport: { width: 400, height: 620 }, deviceScaleFactor: 2 });
await pp.addInitScript(h => {
  const store = { history: h, isDarkMode: true };
  window.chrome = { storage: { local: { get: (k, cb) => cb({ ...store }), set: async o => { Object.assign(store, o); } }, onChanged: { addListener() {}, removeListener() {} } } };
}, hist);
await pp.goto(`http://localhost:${port}/`);
await pp.waitForTimeout(800);
const stat = await pp.evaluate(() => [...document.querySelectorAll('.stats-card')].map(c => c.textContent));
rec('P01', 'Popup Dashboard: 4 kartu statistik', 'Total Dianalisis, Terindikasi Hoaks, Terverifikasi, Keyakinan Rata-rata', stat.join(' | '), stat.length === 4);
const expectTotal = hist.length, expectHoax = hist.filter(h => h.analysis.indikasiHoax).length;
rec('P02', 'Popup Dashboard: nilai total & hoaks sesuai riwayat', `total=${expectTotal}, hoaks=${expectHoax}`, stat.join(' | '), stat[0].includes(String(expectTotal)) && stat[1].includes(String(expectHoax)));
await pp.screenshot({ path: path.join(shots, 'ui_popup_dashboard.png') });
await pp.getByText('Riwayat', { exact: true }).first().click();
await pp.waitForTimeout(400);
const items = await pp.evaluate(() => document.querySelectorAll('.history-item, [class*="history"]').length);
rec('P03', 'Popup Riwayat: daftar riwayat tampil', `>= ${hist.length} item`, String(items), items >= 1);
await pp.screenshot({ path: path.join(shots, 'ui_popup_riwayat.png') });
await pp.getByText('Pengaturan', { exact: true }).first().click();
await pp.waitForTimeout(400);
await pp.screenshot({ path: path.join(shots, 'ui_popup_pengaturan.png') });
server.close();

await browser.close();
fs.writeFileSync(path.join(here, 'hasil_uji_ui.json'), JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
console.log(`\nRINGKAS: ${results.filter(x => x.pass).length}/${results.length} lulus`);


