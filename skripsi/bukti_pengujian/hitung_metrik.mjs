// Menghitung metrik evaluasi dari hasil_uji_klaim.json + penilaian relevansi rujukan oleh peneliti.
// R = langsung membahas klaim/peristiwa; T = topikal tetapi tidak langsung membahas klaim; X = tidak relevan.
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync(new URL('./hasil_uji_klaim.json', import.meta.url), 'utf8')).results;

const REL = {
  H01: 'RTRR', H02: 'RRRRRR', H03: 'TTTTT', H04: 'RRTTXT', H05: 'TTT', H06: 'RRRRRR', H07: 'RRR', H08: 'RRR', H09: 'RRT', H10: 'TRRRT',
  V01: 'RRR', V02: 'RTT', V03: 'RRR', V04: 'TRXXRX', V05: 'RRR', V06: 'RRR', V07: 'RRRR', V08: 'RTT', V09: 'TRXTTT', V10: 'RRRTXX',
};
// H01: urutan sumber = [Klinik Hoaks (judul generik)=T, Cekfakta TBC Bill Gates=R? -> lihat catatan]
REL.H01 = 'TTRR'; // Klinik Hoaks (generik)=T, Cekfakta vaksin TBC Bill Gates=T, detik microchip vaksin=R, Saber Hoaks chip vaksin=R
REL.H09 = 'RRT';
REL.H10 = 'TRRRT'; // Komdigi (judul generik)=T, Columbia Asia=R, Saber Hoaks=R, Blitar=R, Klinik Hoaks (generik)=T
REL.V04 = 'TRXXRX'; // Klinik Hoaks=T, Pemkab Aceh Timur=R, Facebook capaja=X, Asahan HUT=X, Setneg pelantikan=R, Padangsidimpuan=X
REL.V09 = 'TRXTTT'; // Fisipol=T, KPU=R, Pemira Unmul=X, BBC Katolik=T, UIN opini=T, VOA=T
REL.V10 = 'RRRTXX'; // Times=R, TribunWow Sari=R, Tribunnews Sari=R, TribunWow Sahroni=T, UHAMKA=X, Tribunjakarta demo 18 Agustus=X

let TP = 0, TN = 0, FP = 0, FN = 0;
const rows = [];
let R = 0, T = 0, X = 0, nSrc = 0, nDirect = 0, nRss = 0;
const lat = [];
for (const d of data) {
  const ok = d.predicted === d.label;
  if (d.label === 'H' && d.predicted === 'H') TP++;
  if (d.label === 'V' && d.predicted === 'V') TN++;
  if (d.label === 'V' && d.predicted === 'H') FP++;
  if (d.label === 'H' && d.predicted === 'V') FN++;
  const rel = REL[d.id];
  if (rel.length !== d.sources.length) throw new Error(`Jumlah penilaian ${d.id}: ${rel.length} != ${d.sources.length}`);
  const r = [...rel].filter(c => c === 'R').length, t = [...rel].filter(c => c === 'T').length, x = [...rel].filter(c => c === 'X').length;
  R += r; T += t; X += x; nSrc += rel.length;
  d.sources.forEach(s => { if (/news\.google\.com\/rss\/articles/.test(s.url)) nRss++; else nDirect++; });
  lat.push(d.latencyMs);
  rows.push({ id: d.id, label: d.label, predicted: d.predicted, ok, jalur: d.jalur, confidence: d.confidence, latencyMs: d.latencyMs, nSources: d.sources.length, R: r, T: t, X: x });
}
const acc = (TP + TN) / data.length, prec = TP / (TP + FP), rec = TP / (TP + FN), f1 = 2 * prec * rec / (prec + rec);
const specificity = TN / (TN + FP);
lat.sort((a, b) => a - b);
const mean = lat.reduce((a, b) => a + b, 0) / lat.length;
const median = (lat[9] + lat[10]) / 2;
const sd = Math.sqrt(lat.reduce((a, b) => a + (b - mean) ** 2, 0) / lat.length);
const aio = data.filter(d => d.jalur === 'Google AI Overview').length;
const metrics = {
  n: data.length, TP, TN, FP, FN,
  akurasi: acc, presisi: prec, recall: rec, f1, spesifisitas: specificity,
  latensi: { min: lat[0], max: lat[lat.length - 1], mean, median, sd, totalDetik: lat.reduce((a, b) => a + b, 0) / 1000 },
  jalurAIO: aio, jalurHeuristik: data.length - aio,
  sumber: { total: nSrc, R, T, X, relevanLangsung: R / nSrc, relevanLangsungAtauTopikal: (R + T) / nSrc, tidakRelevan: X / nSrc, langsungDariArtikel: nDirect, viaGoogleNewsRss: nRss,
    klaimDenganMinimal1R: rows.filter(r => r.R >= 1).length },
  rataSumberPerKlaim: nSrc / data.length,
};
fs.writeFileSync(new URL('./metrik_evaluasi.json', import.meta.url), JSON.stringify({ metrics, rows, REL }, null, 2));
console.log(JSON.stringify(metrics, null, 2));
console.table(rows.map(r => ({ id: r.id, label: r.label, pred: r.predicted, ok: r.ok, ms: r.latencyMs, src: r.nSources, R: r.R, T: r.T, X: r.X })));

