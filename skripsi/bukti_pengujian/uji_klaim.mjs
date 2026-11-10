// Skrip pengujian kinerja klasifikasi Threadibility (memanggil endpoint nyata POST /api/analyze).
// Label acuan (H = hoax/disinformasi/satire, V = valid/benar) ditetapkan dari fakta umum dan
// pemberitaan media nasional (lihat basis label pada tiap butir).
import fs from 'node:fs';

const API = 'http://localhost:5000/api/analyze';

const CLAIMS = [
  // ---- Hoax / disinformasi / satire (H) ----
  { id: 'H01', label: 'H', basis: 'Klaim konspirasi vaksin telah dibantah otoritas kesehatan', text: 'Vaksin COVID-19 mengandung chip pelacak yang ditanam oleh Bill Gates untuk memantau seluruh warga dunia.' },
  { id: 'H02', label: 'H', basis: 'Bertentangan dengan konsensus ilmiah', text: 'Bumi itu datar dan NASA membohongi seluruh dunia selama puluhan tahun.' },
  { id: 'H03', label: 'H', basis: 'Pola penipuan/phishing berkedok bantuan', text: 'SELAMAT! Kamu terpilih dapat saldo DANA gratis Rp 2 juta dari bantuan presiden, klik link ini sebelum dihapus dan sebarkan ke 5 grup.' },
  { id: 'H04', label: 'H', basis: 'Klaim pengobatan tanpa bukti medis', text: 'Minum air rebusan daun sirsak tiga kali sehari terbukti menyembuhkan kanker stadium 4 dalam seminggu.' },
  { id: 'H05', label: 'H', basis: 'Tidak ada penetapan upah semacam itu; pola hoax ketenagakerjaan', text: 'Mulai besok semua buruh di Indonesia otomatis gajinya naik jadi 10 juta per bulan, sudah diteken presiden.' },
  { id: 'H06', label: 'H', basis: 'Kasus nyata penulis: satire pada Threads @pergijauh (29/10/2026)', text: 'Demi ikut (di)sumpah(in) pemuda, salah satu mahasiswa Unhar (universitas harvard) rela meninggalkan sidang tesis neuroscience-nya 1/2' },
  { id: 'H07', label: 'H', basis: 'Kasus nyata penulis: narasi pemanggilan ke Hambalang dibantah media (jadwal pertemuan lain)', text: 'INFO VALID. PRABOWO KETAR KETIR PANGGIL PANGLIMA TNI POLRI KE HAMBALANG, MAKANYA DARI PAGI HELI BOLAK BALIK DIATAS UDARA BOGOR. LANJUTKAN DEMO, IT WORKSSSS!!! KAWAL TRISAKTI, UNJ, UNTAR, ATMAJAYA HARI INI! WARGA JAGA WARGA' },
  { id: 'H08', label: 'H', basis: 'Klaim 5G-corona telah dibantah WHO/otoritas kesehatan', text: 'Radiasi jaringan 5G menyebabkan penyebaran virus corona di seluruh dunia.' },
  { id: 'H09', label: 'H', basis: 'Tidak ada program penghapusan utang pinjol massal oleh pemerintah', text: 'Pemerintah resmi menghapus seluruh utang pinjol masyarakat mulai bulan depan lewat program nasional dari presiden.' },
  { id: 'H10', label: 'H', basis: 'Klaim kesehatan tanpa dasar ilmiah', text: 'Minum air es setelah makan membuat lemak membeku di perut dan langsung menyebabkan kanker usus.' },
  // ---- Valid / terverifikasi (V) ----
  { id: 'V01', label: 'V', basis: 'Kasus nyata penulis: dilaporkan Kompas.com, Tribunnews, Mashable (30/10/2026)', text: 'Konten kreator Willie Salim sampaikan permintaan maaf karena hadiri acara Deklarasi Sumpah Pemuda Mahasiswa Indonesia 2026 di Bundaran Hotel Indonesia (HI), Jakarta, Kamis (29/10/2026).' },
  { id: 'V02', label: 'V', basis: 'Fakta kalender nasional', text: 'Hari Sumpah Pemuda diperingati setiap tanggal 28 Oktober di Indonesia.' },
  { id: 'V03', label: 'V', basis: 'Fakta olahraga', text: 'Argentina menjuarai Piala Dunia FIFA 2022 setelah mengalahkan Prancis lewat adu penalti di final.' },
  { id: 'V04', label: 'V', basis: 'Fakta politik', text: 'Prabowo Subianto dilantik sebagai Presiden Republik Indonesia pada 20 Oktober 2024.' },
  { id: 'V05', label: 'V', basis: 'Fakta regulasi (UU IKN)', text: 'Ibu kota negara Indonesia dipindahkan secara bertahap ke Nusantara di Kalimantan Timur berdasarkan UU IKN.' },
  { id: 'V06', label: 'V', basis: 'Fakta geologi', text: 'Indonesia berada di kawasan Cincin Api Pasifik sehingga rawan gempa bumi dan letusan gunung berapi.' },
  { id: 'V07', label: 'V', basis: 'Kasus nyata: dilaporkan Kompas.tv, Tirto.id, Suara.com (Okt 2026)', text: 'Peserta Deklarasi Sumpah Pemuda di Bundaran HI mengaku bukan mahasiswa dan mengaku mendapat bayaran.' },
  { id: 'V08', label: 'V', basis: 'Fakta geologi', text: 'Gunung Merapi di perbatasan Yogyakarta dan Jawa Tengah merupakan salah satu gunung berapi paling aktif di Indonesia.' },
  { id: 'V09', label: 'V', basis: 'Fakta pemilu', text: 'Pemilihan Presiden Indonesia 2024 diikuti tiga pasangan calon presiden dan wakil presiden.' },
  { id: 'V10', label: 'V', basis: 'Kasus nyata: dilaporkan Antara News (30/10/2026)', text: 'Polisi menggelar Deklarasi Sumpah Pemuda Mahasiswa Indonesia 2026 di Bundaran HI Jakarta yang dihadiri Raffi Ahmad.' },
];

const results = [];
const t0 = Date.now();
for (const c of CLAIMS) {
  const start = Date.now();
  let rec = { id: c.id, label: c.label, basis: c.basis, text: c.text };
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text: c.text, username: '@uji_threadibility', postUrl: null, timestamp: null }),
      signal: AbortSignal.timeout(120000)
    });
    const latencyMs = Date.now() - start;
    const json = await res.json();
    const alasan = json.alasan || '';
    const heuristic = /^\[Evaluasi/.test(alasan) || /Berdasarkan penelusuran fakta dan konsensus berita resmi/.test(alasan);
    rec = {
      ...rec,
      http: res.status,
      latencyMs,
      predicted: json.indikasiHoax ? 'H' : 'V',
      confidence: json.confidence,
      alasan,
      alasanChars: alasan.length,
      jalur: heuristic ? 'heuristik (tanpa Ringkasan AI)' : 'Google AI Overview',
      sources: (json.factCheckSources || []).map(s => ({ publisher: s.publisher, title: s.title, verdict: s.verdict, url: s.sourceUrl, date: s.reviewDate })),
    };
  } catch (e) {
    rec = { ...rec, error: String(e), latencyMs: Date.now() - start };
  }
  results.push(rec);
  console.log(`${c.id} label=${c.label} pred=${rec.predicted} conf=${rec.confidence} ${rec.latencyMs}ms src=${rec.sources?.length} jalur=${rec.jalur}`);
  fs.writeFileSync(new URL('./hasil_uji_klaim.json', import.meta.url), JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
}
console.log('SELESAI total', Math.round((Date.now() - t0) / 1000), 's');

