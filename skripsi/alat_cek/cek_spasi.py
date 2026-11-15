"""Pemeriksa spasi antarkata dan pemenggalan kata pada PDF skripsi.

Pemakaian (dari folder skripsi/):
    python -I alat_cek/cek_spasi.py <pdf> <main.tex> [ambang_pt=6.0] [n_terburuk=10]

Yang diperiksa pada seluruh halaman isi (halaman PDF ke-6 dan seterusnya):
1. Celah rata-rata antarkata pada baris rata kanan-kiri (celah normal Times New Roman 12 pt = 3 pt),
   termasuk perbandingan celah sesudah tanda titik dengan celah biasa (harus nyaris sama,
   seperti di Microsoft Word; Pedoman 1.3 butir 6).
2. Pemenggalan kata di akhir baris: kata asing/nama/kode tidak boleh dipenggal, dan pemenggalan
   kata Indonesia harus mengikuti kaidah (Pedoman 1.6). Pelanggaran dicetak beserta usulan
   entri untuk daftar MANUAL di alat_cek/gen_pemenggalan.py.
Kode keluar 1 bila ada pemenggalan bermasalah.
"""
import collections
import os
import re
import statistics
import sys

import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_pemenggalan import (DIGRAPHS, ONSETS, PREFIXES, SUFFIXES, V, hyphenated,  # noqa: E402
                             load_words, syllable_breaks, units)

sys.stdout.reconfigure(encoding='utf-8')

pdf, tex = sys.argv[1], sys.argv[2]
THR = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
SHOW = int(sys.argv[4]) if len(sys.argv) > 4 else 10

foreign, natural, _indonesian = load_words(tex)
# Kata yang sudah punya pengecualian bertitik pemenggalan eksplisit di pemenggalan.tex dianggap terverifikasi.
explicit = set()
_pem = os.path.join(os.path.dirname(os.path.abspath(tex)), 'pemenggalan.tex')
if os.path.exists(_pem):
    for tok in re.findall(r'[A-Za-z]+(?:-[A-Za-z]+)+', re.sub(r'%.*', '', open(_pem, encoding='utf-8').read())):
        explicit.add(tok.replace('-', '').lower())
d = pymupdf.open(pdf)
RIGHT = 113.4 + 396.0  # tepi kanan area teks (margin kiri 4 cm + lebar teks 396 pt)
lines_info, after_period, other_gaps, breaks = [], [], [], []
for pno, page in enumerate(d):
    if pno < 5:
        continue
    words = page.get_text('words')
    by = collections.defaultdict(list)
    for w in words:
        by[(w[5], w[6])].append(w)
    ordered = sorted(by.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    for idx, ((blk, _ln), ws) in enumerate(ordered):
        ws.sort(key=lambda w: w[0])
        if ws[0][1] < 95 and not page.rotation:
            continue
        last = ws[-1]
        if re.search(r'[A-Za-z]-$', last[4]) and idx + 1 < len(ordered) and ordered[idx + 1][0][0] == blk:
            nxt = sorted(ordered[idx + 1][1], key=lambda w: w[0])[0][4]
            m_left = re.search(r'([A-Za-z]+)-$', last[4])
            m_right = re.match(r'[A-Za-z]+', nxt)
            if m_left and m_right:
                breaks.append((pno - 4, m_left.group(1), m_right.group(0)))
        if page.rotation or len(ws) < 6 or abs(last[2] - RIGHT) > 2.0:
            continue
        if re.fullmatch(r'\d+\.|[a-z]\.|\[\d+\]|•', ws[0][4]):
            ws = ws[1:]  # penanda butir daftar: jaraknya tetap, bukan spasi kata
        gaps = [ws[i + 1][0] - ws[i][2] for i in range(len(ws) - 1)]
        lines_info.append((statistics.mean(gaps), max(gaps), pno - 4, ' '.join(w[4] for w in ws)))
        for i, g in enumerate(gaps):
            (after_period if re.search(r'[.!?]$', ws[i][4]) else other_gaps).append(g)

# ----------------------------------------------------------------- laporan spasi
n = len(lines_info)
means = sorted(x[0] for x in lines_info)
print(f'[SPASI] baris rata kanan-kiri: {n}')
print(f'  rata-rata celah per baris (pt): median={means[n // 2]:.2f}  p90={means[int(n * .9)]:.2f}  maks={means[-1]:.2f}')
for t in (5.0, 6.0, 7.0):
    print(f'  baris dengan celah rata-rata > {t} pt: {sum(1 for m in means if m > t)}')
ap, og = statistics.mean(after_period), statistics.mean(other_gaps)
print(f'  celah sesudah titik/tanda baca akhir: {ap:.2f} pt | celah lain: {og:.2f} pt | rasio {ap / og:.2f} (harus <= 1,15)')
bad = sorted([x for x in lines_info if x[0] > THR], reverse=True)
print(f'  baris terburuk (celah rata-rata > {THR} pt): {len(bad)}')
for m, _mx, pg, txt in bad[:SHOW]:
    print(f'    hal {pg:>2}  rata-rata={m:.1f}  {txt[:90]}')

# ----------------------------------------------------------------- laporan pemenggalan
print(f'\n[PEMENGGALAN] {len(breaks)} baris berakhir tanda hubung')
flag = collections.OrderedDict()
for pg, left, right in breaks:
    word = (left + right).lower()
    if (left + '-' + right).lower() in natural:
        continue  # tanda hubung asli (mis. real-time), bukan pemenggalan
    if word in explicit:
        continue  # pemenggalan eksplisit yang sudah diperiksa di pemenggalan.tex
    reasons = []
    if word in foreign:
        reasons.append('kata asing/nama/kode dipenggal')
    if len(left) < 2 or len(right) < 2:
        reasons.append('serpihan 1 huruf')
    l, r = left[-1].lower(), right[0].lower()
    if l == 'k' and right.lower() == 'an':
        reasons.append('akhiran -kan terpecah (k-an)')
    if l + r in DIGRAPHS:
        reasons.append('huruf rangkap ng/ny/sy/kh terpecah')
    if l + r in ('ai', 'au', 'oi'):
        reasons.append('diftong terpecah')
    tail = units(left.lower())
    if len(tail) >= 2 and tail[-1] not in V and tail[-2] not in V and r not in V:
        reasons.append('gugus konsonan terpecah di tempat salah')
    if not reasons and (len(left) + len(right)) >= 7:
        cuts = syllable_breaks(word)
        onset = right.lower()[:2] in ONSETS or right.lower()[:3] in ONSETS
        morph = left.lower() in PREFIXES or right.lower() in SUFFIXES
        if len(left) not in cuts and not morph and not (l in V and onset):
            reasons.append('bukan batas suku kata')
    if reasons:
        flag.setdefault(word, (pg, left, right, reasons))
if not flag:
    print('  semua pemenggalan wajar.')
else:
    print(f'  PEMENGGALAN BERMASALAH: {len(flag)} kata')
    for word, (pg, left, right, reasons) in flag.items():
        fix = word if word in foreign else hyphenated(word)
        print(f'    hal {pg:>2}  {left}-|{right}  ({"; ".join(reasons)})  -> {fix}')
    print('  Usulan entri (kata asing: tambahkan dengan huruf miring di naskah; kata Indonesia: tambahkan ke MANUAL):')
    print('   ', ' '.join(word if word in foreign else hyphenated(word) for word in flag))

# ----------------------------------------------------------------- spasi terlalu rapat & judul tertinggal
print('\n[TATA LETAK]')
tight = []
for pno, page in enumerate(d):
    if pno < 5:
        continue
    for w in page.get_text('words'):
        tok = re.sub(r'^[(\[“"]+|[,;:.)\]”"]+$', '', w[4])
        if len(tok) >= 22 and re.fullmatch(r'[A-Za-z]+', tok):
            tight.append((pno - 4, tok[:36]))  # beberapa kata menyatu karena spasi dimampatkan habis
if tight:
    print(f'  BARIS TERLALU RAPAT (kata menyatu): {len(tight)}', tight[:8])
else:
    print('  tidak ada baris yang spasinya terlalu rapat.')
orphans = []
for pno, page in enumerate(d):
    if pno < 5 or page.rotation:
        continue
    lines = [ln.strip() for b in page.get_text('blocks') if b[1] > 100 and b[3] < 790 for ln in b[4].split('\n') if ln.strip()]
    # baris terakhir yang tepat di atas garis tabel panjang adalah isi sel, bukan judul yang tertinggal
    ymax = max([b[3] for b in page.get_text('blocks') if b[1] > 100 and b[3] < 790 and b[4].strip()] or [0])
    in_table = any(dr['rect'].height < 1.5 and dr['rect'].width > 120 and 0 <= dr['rect'].y0 - ymax < 12 for dr in page.get_drawings())
    if lines and not in_table:
        last = lines[-1]
        if re.match(r'(Gambar|Tabel) \d+\.\d+|(Diadaptasi|Diolah) dari', last):
            continue  # judul/keterangan gambar atau tabel memang boleh di dasar halaman
        if pno == len(d) - 1 or last.startswith('http'):
            continue  # halaman terakhir dokumen dan baris URL penutup entri Daftar Pustaka bukan judul
        if len(last) < 60 and not re.search(r'[.:;,)\]]$', last) and not re.fullmatch(r'\d+', last):
            orphans.append((pno - 4, last))
if orphans:
    print(f'  JUDUL/BUTIR TERTINGGAL DI DASAR HALAMAN (periksa, mungkin perlu \\nopagebreak): {orphans}')
else:
    print('  tidak ada judul yang tertinggal sendirian di dasar halaman.')

# ----------------------------------------------------------------- penempatan gambar (AGENTS.md bagian 8)
print('\n[GAMBAR]')
fig_issues = []
body_text = {pno: pg.get_text() for pno, pg in enumerate(d) if pno >= 5}
n_fig = 0
for pno, page in enumerate(d):
    if pno < 5 or page.rotation:
        continue
    imgs = [pymupdf.Rect(x['bbox']) for x in page.get_image_info() if pymupdf.Rect(x['bbox']).width > 150]
    if not imgs:
        continue
    for r in imgs:
        n_fig += 1
        cap = None
        for b in page.get_text('blocks'):
            m = re.match(r'Gambar (\d+\.\d+) ', b[4])
            if m and r.y1 - 2 <= b[1] <= r.y1 + 70:
                cap = m.group(1)
        if not cap:
            fig_issues.append(f'hal {pno - 4}: gambar tanpa judul "Gambar n.m" tepat di bawahnya')
            continue
        pat = re.compile(r'Gambar\s*' + re.escape(cap) + r'(?!\d)')
        first = None
        for q, txt in body_text.items():
            cnt = len(pat.findall(txt)) - (1 if q == pno else 0)  # kurangi judul gambar itu sendiri
            if cnt > 0:
                first = q
                break
        if first is None:
            fig_issues.append(f'Gambar {cap} (hal {pno - 4}) tidak pernah disebut di teks')
        elif first > pno + 1:
            # gambar boleh tepat di bawah judul subbab sebelum kalimat yang menyebutnya (paling jauh satu halaman)
            fig_issues.append(f'Gambar {cap} muncul di hal {pno - 4}, tetapi baru disebut di hal {first - 4}')
        elif pno - first > 1:
            fig_issues.append(f'Gambar {cap} (hal {pno - 4}) jauh dari penyebutan pertama (hal {first - 4})')
gaps = []
for pno, page in enumerate(d):
    if pno < 5 or page.rotation or pno + 1 >= d.page_count:
        continue
    blocks = [b for b in page.get_text('blocks') if b[1] > 100 and b[3] < 790]
    low = max([b[3] for b in blocks] + [r.y1 for r in [pymupdf.Rect(x['bbox']) for x in page.get_image_info()]] + [0])
    nxt = d[pno + 1]
    nxt_head = nxt.get_text()[:60]
    # akhir bab, halaman landscape, serta tabel/gambar setinggi satu halaman (Pedoman 6.3 dan 6.7) boleh didahului ruang kosong
    # (halaman berikutnya berisi gambar setinggi > 350 pt di awalnya juga dihitung, mis. judul subbab + Gambar 1.1)
    tall_fig = any(pymupdf.Rect(x['bbox']).height > 350 and pymupdf.Rect(x['bbox']).y0 < 250 for x in nxt.get_image_info())
    if low < 520 and not tall_fig and not nxt.rotation and not re.match(r'\s*(\d+\s*)?(BAB \d|DAFTAR PUSTAKA|DAFTAR SIMBOL|[A-D]\. Simbol|Tabel \d|Gambar \d)', nxt_head):
        gaps.append((pno - 4, int(low)))
if fig_issues:
    for t in fig_issues:
        print('  ' + t)
else:
    print(f'  {n_fig} gambar: semuanya tepat di bawah penyebutannya, dengan judul "Gambar n.m" di bawah gambar.')
if gaps:
    print(f'  RUANG KOSONG BESAR di dasar halaman (hal, y akhir isi): {gaps}')
else:
    print('  tidak ada ruang kosong besar di dasar halaman (kecuali akhir bab).')

# ----------------------------------------------------------------- spasi antarkata di dalam sel tabel
print('\n[TABEL]')


def cluster_lines(words, rot, rules):
    """Kelompokkan kata menjadi baris berdasarkan posisi (bukan struktur baris PyMuPDF yang memecah baris
    bercelah lebar), per sel tabel. rot=True: halaman landscape tersimpan terputar (arah baca = y menurun)."""
    cells = collections.defaultdict(list)
    for w in words:
        if rot:
            cid = sum(1 for y in rules if y > w[3] - 0.5)
        else:
            cid = sum(1 for x in rules if x < w[0] + 0.5)
        cells[cid].append(w)
    out = []
    for ws in cells.values():
        ws.sort(key=lambda w: (w[0] if rot else w[1]))
        cur, ref = [], None
        for w in ws:
            pos = w[0] if rot else w[1]
            if ref is None or abs(pos - ref) <= 3.0:
                cur.append(w)
                ref = pos if ref is None else ref
            else:
                out.append(cur)
                cur, ref = [w], pos
        if cur:
            out.append(cur)
    return out


cell_rows = []
for pno, page in enumerate(d):
    if pno < 5:
        continue
    rot = page.rotation == 90
    rules = set()
    for dr in page.get_drawings():
        for it in dr['items']:
            if it[0] != 'l':
                continue
            a_, b_ = it[1], it[2]
            if rot and abs(a_.y - b_.y) < 0.5 and abs(a_.x - b_.x) > 20:
                rules.add(round(a_.y, 1))
            if not rot and abs(a_.x - b_.x) < 0.5 and abs(a_.y - b_.y) > 20:
                rules.add(round(a_.x, 1))
    if len(rules) < 2:
        continue
    rules = sorted(rules, reverse=rot)
    for ws in cluster_lines(page.get_text('words'), rot, rules):
        if len(ws) < 2:
            continue
        if rot:
            ws.sort(key=lambda w: -w[3])
            bound = next((y for y in rules if y < ws[0][3] - 1), None)
            if bound is None or ws[-1][1] > bound + 7:
                continue  # bukan baris rata kanan-kiri di dalam sel
            cgaps = [ws[i][1] - ws[i + 1][3] for i in range(len(ws) - 1)]
        else:
            ws.sort(key=lambda w: w[0])
            bound = next((x for x in rules if x > ws[0][0] + 1), None)
            if bound is None or not (bound - 7 <= ws[-1][2] <= bound + 1):
                continue
            cgaps = [ws[i + 1][0] - ws[i][2] for i in range(len(ws) - 1)]
        cell_rows.append((statistics.mean(cgaps), pno - 4, ' '.join(w[4] for w in ws)))
cell_bad = sorted([r for r in cell_rows if r[0] > THR], reverse=True)
if cell_rows:
    cm = sorted(r[0] for r in cell_rows)
    print(f'  baris sel rata kanan-kiri: {len(cell_rows)} | median={cm[len(cm) // 2]:.1f} pt | maks={cm[-1]:.1f} pt | '
          f'di atas {THR} pt: {len(cell_bad)}')
for m, pg, txt in cell_bad[:10]:
    print(f'    hal {pg:>2}  rata-rata={m:.1f}  {txt[:70]}')
if cell_bad:
    print('  (sel yang berisi nama/judul asing atau kolom < ~4 cm: rata kiri; lihat AGENTS.md bagian 3)')


# --- GARIS TABEL (AGENTS.md bagian 14): 0,5 pt, hitam, tidak digambar dobel ---
print('\n[GARIS TABEL]')
line_bad = []
n_h = 0
for pno, page in enumerate(d):
    seen = {}
    for dr in page.get_drawings():
        if dr['type'] != 's' or not dr.get('width'):
            continue
        for it in dr['items']:
            if it[0] != 'l':
                continue
            a, b = it[1], it[2]
            ln = max(abs(a.x - b.x), abs(a.y - b.y))
            horiz = abs(a.y - b.y) < 0.05
            vert = abs(a.x - b.x) < 0.05
            if ln < 60 or not (horiz or vert):
                continue
            n_h += 1
            key = (round(a.x, 1), round(a.y, 1), round(b.x, 1), round(b.y, 1))
            seen[key] = seen.get(key, 0) + 1
            col = tuple(dr.get('color') or (0, 0, 0))
            if abs(dr['width'] - 0.5) > 0.03 or max(col) > 0.01:
                line_bad.append((pno + 1, 'tebal/warna', round(dr['width'], 2), col))
    for key, v in seen.items():
        if v > 1 and abs(key[1] - key[3]) < 0.05:
            line_bad.append((pno + 1, 'garis dobel', key, v))
print(f'  {n_h} garis panjang diperiksa (tebal 0,5 pt, hitam, tanpa gambar dobel)')
for t in line_bad[:10]:
    print('    hal', t)

problems = []
if line_bad:
    problems.append(f'{len(line_bad)} garis tabel tidak seragam')
if cell_bad:
    problems.append(f'{len(cell_bad)} baris tabel dengan celah rata-rata > {THR} pt')
if fig_issues:
    problems.append(f'{len(fig_issues)} masalah penempatan gambar')
if gaps:
    problems.append(f'{len(gaps)} halaman dengan ruang kosong besar')
if bad:
    problems.append(f'{len(bad)} baris dengan celah rata-rata > {THR} pt')
if ap / og > 1.15:
    problems.append('celah sesudah titik terlalu lebar (cek \\frenchspacing)')
if flag:
    problems.append(f'{len(flag)} pemenggalan bermasalah')
if tight:
    problems.append(f'{len(tight)} baris terlalu rapat')
if orphans:
    problems.append(f'{len(orphans)} judul tertinggal di dasar halaman')
print('\nHASIL:', 'LOLOS' if not problems else 'PERLU DIPERBAIKI -> ' + '; '.join(problems))
sys.exit(1 if problems else 0)
