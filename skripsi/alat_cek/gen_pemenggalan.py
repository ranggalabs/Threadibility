"""Pembuat daftar pengecualian pemenggalan kata (pemenggalan.tex) dari isi main.tex.

Pemakaian (dari folder skripsi/):
    python -I alat_cek/gen_pemenggalan.py revisi_bab1_bab2/main.tex revisi_bab1_bab2/pemenggalan.tex

Isi berkas keluaran:
- kata asing, nama produk, dan kode (tulisan miring/\\texttt/Daftar Pustaka/nama diri): TIDAK boleh dipenggal;
- kata Indonesia berakhiran -kan: dipenggal menurut suku kata (se-dang-kan), bukan "sedangk-an";
- entri manual (MANUAL di bawah) untuk kata yang pemenggalan otomatisnya salah.
Jalankan ulang setiap kali teks naskah berubah, lalu kompilasi dan jalankan cek_spasi.py.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_pemenggalan import hyphenated, load_words  # noqa: E402

# Entri manual: tambahkan di sini bila cek_spasi.py melaporkan pemenggalan yang salah.
MANUAL = [
    'skrip-si',
    'ek-sten-si',
    'ter-struk-tur',
    'plat-form',   # pola otomatis memberi "pla-tform"
    'ma-u-pun',    # KBBI: ma.u.pun (au di sini bukan diftong)
    'meng-ek-strak-si',
    'lain',        # kata 4 huruf: jangan dipenggal (la-in)
    'system',      # kata asing: jangan dipenggal (sys-tem)
    'in-do-ne-sia',  # nama diri berbahasa Indonesia boleh dipenggal
]

tex, out = sys.argv[1], sys.argv[2]
foreign, _natural, indonesian = load_words(tex)

keep = sorted(w for w in foreign if re.fullmatch(r'[a-z]{4,}', w))
kan = sorted(w for w in indonesian if re.fullmatch(r'[a-z]{4,}kan', w))
manual_plain = {m.replace('-', '') for m in MANUAL}
kan = [w for w in kan if w not in manual_plain]
keep = [w for w in keep if w not in manual_plain]  # entri manual menggantikan aturan "tidak dipenggal"

lines = [
    '% BERKAS DIBUAT OTOMATIS oleh alat_cek/gen_pemenggalan.py - jangan disunting dengan tangan.',
    '% Tambahkan entri manual pada daftar MANUAL di skrip tersebut.',
    '\\hyphenation{',
    '  % kata asing, nama, dan kode: tidak boleh dipenggal',
]
lines += ['  ' + ' '.join(keep[i:i + 8]) for i in range(0, len(keep), 8)]
lines.append('  % kata Indonesia berakhiran -kan: dipenggal menurut suku kata')
kan_h = [hyphenated(w) for w in kan]
lines += ['  ' + ' '.join(kan_h[i:i + 6]) for i in range(0, len(kan_h), 6)]
lines.append('  % entri manual')
lines.append('  ' + ' '.join(MANUAL))
lines.append('}')
open(out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print(f'{out}: {len(keep)} kata asing/nama (tanpa pemenggalan), {len(kan)} kata -kan, {len(MANUAL)} entri manual')
