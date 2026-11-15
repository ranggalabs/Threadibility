/** Cetak hasil pencarian biasa yang terbaca untuk satu klaim (untuk memeriksa pengambilan hasil). */
import { fetchGoogleAiOverview, extractClaimKeywords, findDebunkEvidence } from '../src/services/googleAiOverview.js';
const text = process.argv[2];
const r = await fetchGoogleAiOverview(text);
const kw = extractClaimKeywords(text, 14);
console.log('AIO:', r.summaryText.length, '| organik:', r.organic.length, '| kata kunci:', kw.join(' '));
for (const o of r.organic.slice(0, 12)) console.log('-', o.title.slice(0, 90), '||', o.snippet.slice(0, 110));
console.log('BANTAHAN:', findDebunkEvidence(r.organic, kw).map((x) => x.title));
process.exit(0);
