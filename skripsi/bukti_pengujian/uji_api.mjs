// Pengujian black-box REST API backend Threadibility (server harus berjalan di localhost:5000).
import fs from 'node:fs';
const BASE = 'http://localhost:5000';
const out = [];
const rec = (id, nama, expected, actual, pass) => { out.push({ id, nama, expected, actual, pass }); console.log(pass ? 'PASS' : 'FAIL', id, nama, '=>', actual); };
const post = (body, raw = false) => fetch(BASE + '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: raw ? body : JSON.stringify(body) });

let r = await post({ text: '', username: '@x' });
rec('A01', 'POST /api/analyze dengan teks kosong', 'HTTP 400', `HTTP ${r.status}`, r.status === 400);
r = await post({ text: '   \n  ', username: '@x' });
rec('A02', 'POST /api/analyze dengan teks hanya spasi', 'HTTP 400', `HTTP ${r.status}`, r.status === 400);
r = await post({ username: '@x' });
rec('A03', 'POST /api/analyze tanpa field text', 'HTTP 400', `HTTP ${r.status}`, r.status === 400);

const t0 = Date.now();
r = await post({ text: 'Hari Sumpah Pemuda diperingati setiap tanggal 28 Oktober di Indonesia.', username: '@uji', postUrl: null, timestamp: null });
const lat1 = Date.now() - t0; const j = await r.json();
rec('A04', 'Skema respons AnalysisResult lengkap', 'claim, indikasiHoax, alasan, confidence, factCheckSources', Object.keys(j).join(', '),
  ['claim', 'indikasiHoax', 'alasan', 'confidence', 'factCheckSources'].every(k => k in j) && typeof j.indikasiHoax === 'boolean' && j.confidence >= 0 && j.confidence <= 1 && Array.isArray(j.factCheckSources));
const fieldsOk = j.factCheckSources.every(s => s.publisher && s.verdict && s.sourceUrl && /^https?:\/\//.test(s.sourceUrl));
rec('A05', 'Setiap sumber memuat publisher, verdict, dan sourceUrl http(s)', 'true', String(fieldsOk), fieldsOk);
rec('A06', 'Alasan tidak memuat sisa CSS/JS atau pesan "Ringkasan AI tidak tersedia"', 'bersih', /tidak tersedia untuk penelusuran|:root\s*\{|\bfunction\s*\(|<style|<script/i.test(j.alasan) ? 'TERCEMAR' : 'bersih', !/tidak tersedia untuk penelusuran|:root\s*\{|\bfunction\s*\(|<style|<script/i.test(j.alasan));
const noGoto = j.factCheckSources.every(s => !/google\.com\/goto/.test(s.sourceUrl));
rec('A07', 'Tidak ada tautan google.com/goto yang belum diselesaikan', 'true', String(noGoto), noGoto);

const t1 = Date.now();
r = await post({ text: 'Hari Sumpah Pemuda diperingati setiap tanggal 28 Oktober di Indonesia.', username: '@uji' });
await r.json(); const lat2 = Date.now() - t1;
rec('A08', 'Permintaan berulang memanfaatkan cache (15 menit)', `< 2000 ms (pertama ${lat1} ms)`, `${lat2} ms`, lat2 < 2000);

r = await post({ text: '𝐕𝐚𝐤𝐬𝐢𝐧 𝐂𝐎𝐕𝐈𝐃-𝟏𝟗 𝐦𝐞𝐧𝐠𝐚𝐧𝐝𝐮𝐧𝐠 𝐜𝐡𝐢𝐩 𝐩𝐞𝐥𝐚𝐜𝐚𝐤 𝐝𝐚𝐫𝐢 𝐁𝐢𝐥𝐥 𝐆𝐚𝐭𝐞𝐬', username: '@uji' });
const jn = await r.json();
rec('A09', 'Teks Unicode bergaya (math bold) dinormalisasi NFKC sehingga tetap terproses', 'HTTP 200 + sumber ≥ 1', `HTTP ${r.status}, sumber ${jn.factCheckSources?.length}`, r.status === 200 && (jn.factCheckSources?.length || 0) >= 1);

r = await fetch(BASE + '/api/history?limit=5'); const h = await r.json();
rec('A10', 'GET /api/history mengembalikan daftar riwayat', 'array ≤ 5 butir', `HTTP ${r.status}, ${Array.isArray(h) ? h.length : 'bukan array'} butir`, r.status === 200 && Array.isArray(h) && h.length > 0 && h.length <= 5);
r = await fetch(BASE + '/api/stats'); const s = await r.json();
rec('A11', 'GET /api/stats memuat total, hoax, verified', 'total = hoax + verified', JSON.stringify({ total: s.total, hoax: s.hoax, verified: s.verified }), s.total === s.hoax + s.verified && s.total > 0);
r = await fetch(BASE + '/api/export'); const csv = await r.text();
rec('A12', 'GET /api/export menghasilkan CSV dengan header', 'Content-Type text/csv + baris header', `${r.headers.get('content-type')} | ${csv.split('\n')[0].slice(0, 60)}`, /text\/csv/.test(r.headers.get('content-type') || '') && csv.startsWith('ID,Timestamp'));
r = await fetch(BASE + '/api/analyze', { method: 'OPTIONS', headers: { Origin: 'chrome-extension://abc', 'Access-Control-Request-Method': 'POST' } });
rec('A13', 'CORS preflight dari origin ekstensi', 'access-control-allow-origin ada', `${r.status} | ${r.headers.get('access-control-allow-origin')}`, !!r.headers.get('access-control-allow-origin'));
r = await fetch(BASE + '/api/test-9router', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
rec('A14', 'Endpoint 9Router sudah dihapus', 'bukan endpoint API aktif (tidak mengembalikan JSON hasil uji)', `HTTP ${r.status}, ${r.headers.get('content-type')}`, !/application\/json/.test(r.headers.get('content-type') || '') || r.status >= 400);

fs.writeFileSync(new URL('./hasil_uji_api.json', import.meta.url), JSON.stringify({ runAt: new Date().toISOString(), results: out }, null, 2));
console.log(`RINGKAS: ${out.filter(x => x.pass).length}/${out.length} lulus`);

