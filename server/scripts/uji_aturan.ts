import fs from 'node:fs';
import { classifyPost } from '../src/services/ruleClassifier.js';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8')) as { text: string; aio: string; indikasiHoax: boolean }[];
let n = 0;
rows.forEach((r, i) => {
  const ctx = r.aio ? `[Ringkasan Google AI Overview]:\n${r.aio}\n\n[Daftar Rujukan Google]:\n` : '';
  const now = classifyPost({ text: r.text, username: null, postUrl: null, timestamp: null }, ctx, []).indikasiHoax;
  if (now !== r.indikasiHoax) { n++; console.log(`[${i}] ${r.indikasiHoax} -> ${now} ${r.text.slice(0, 80).replace(/\n/g, ' ')}`); }
});
console.log('berubah:', n, 'dari', rows.length);
