/**
 * Diagnosa: telusuri ulang klaim dari riwayat dan simpan ringkasan Google AI Overview,
 * rujukan, serta keputusan klasifikasi, tanpa menulis ke riwayat server.
 *
 * Pakai (dari folder server):
 *   GOOGLE_PROFILE_DIR=<salinan profil> npx tsx scripts/diagnosa.ts <berkas_teks.json> <keluaran.json>
 * Berkas masukan: larik string berisi teks klaim.
 */
import fs from 'node:fs';
import { searchFactCheckSources } from '../src/services/webSearch.js';
import { classifyPost } from '../src/services/ruleClassifier.js';

const [inFile, outFile] = process.argv.slice(2);
const texts: string[] = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
const out: unknown[] = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf-8')) : [];
const done = new Set((out as { text: string }[]).map((o) => o.text));

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const text of texts) {
  if (done.has(text)) continue;
  // Beri jeda antarklaim agar Google tidak menganggap lalu lintas ini bot (CAPTCHA).
  if (out.length > 0) await jeda(10000 + Math.floor(Math.random() * 8000));
  const t0 = Date.now();
  let err = '';
  let s: Awaited<ReturnType<typeof searchFactCheckSources>>;
  try {
    s = await searchFactCheckSources(text, null);
  } catch (e) {
    err = String(e);
    continue;
  }
  const m = s.summaryContext.match(/\[Ringkasan Google AI Overview\]:\s*([\s\S]*?)(?=\n\n\[Daftar Rujukan|$)/);
  const aio = m ? m[1].trim() : '';
  const res = classifyPost({ text, username: null, postUrl: null, timestamp: null }, s.summaryContext, s.sources);
  out.push({
    text,
    aio,
    err,
    indikasiHoax: res.indikasiHoax,
    dasar: res.dasar,
    alasan: res.alasan,
    verdicts: s.sources.map((x) => `${x.publisher} | ${x.verdict}`),
    ms: Date.now() - t0
  });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1), 'utf-8');
  console.log(`${out.length}/${texts.length} hoax=${res.indikasiHoax} aio=${aio.length}`);
}
process.exit(0);
