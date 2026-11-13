"""Pemeriksa kata/frasa terlarang pada naskah (aturan gaya bahasa AGENTS.md bagian 6).

Pemakaian (dari folder skripsi/):
    python -I alat_cek/cek_kata.py revisi_bab1_bab2/main.tex

Mencari frasa klise AI, kata sulit/jarang, kata kiasan atau terjemahan harfiah, dan ejaan yang salah.
Setiap temuan dicetak dengan nomor baris dan usulan pengganti. Kode keluar 1 bila ada temuan.
Tambahkan kata baru ke daftar BANNED bila penulis menyatakan suatu kata terdengar tidak natural.
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# (pola regex tanpa huruf besar-kecil, pengganti yang disarankan)
BANNED = [
    # frasa klise AI (aturan 2)
    (r'selain itu', 'Tidak sedikit pula / ... (sambung langsung ke gagasan sebelumnya)'),
    (r'lebih lanjut', 'pada tahap berikutnya / hapus'),
    (r'oleh karena itu', 'akibatnya / karena itu'),
    (r'dalam konteks ini', 'hapus atau sebut langsung objeknya'),
    (r'secara keseluruhan', 'hapus / utuh'),
    (r'sangat penting untuk dicatat', 'hapus'),
    (r'menunjukkan bahwa', 'langsung sebut hasilnya'),
    # kata sulit atau jarang (aturan 6)
    (r'sintesis', 'penyusunan'), (r'hiperbola', 'dilebih-lebihkan'), (r'dipelintir', 'diubah agar menyesatkan'),
    (r'terkecoh', 'tertipu'), (r'mengada-ada', 'tidak sesuai fakta'), (r'pijakan', 'berpegang pada'),
    (r'aktual', 'terbaru / sebenarnya (ground truth)'), (r'menyematkan', 'memasang'), (r'menyuntikkan', 'menampilkan'),
    (r'disisipkan', 'dipasang'), (r'penyuntikan', 'penampilan'), (r'memangkas', 'mempersingkat'),
    (r'resolusi (tautan|alamat)', 'pelacakan tautan'), (r'irisan kata kunci', 'kata kunci yang sama'),
    (r'kandidat', 'calon'), (r'terotomasi', 'otomatis'), (r'keabsahan', 'kebenaran'), (r'finansial', 'materi'),
    (r'peladen', 'server'), (r'korpus', 'kumpulan publikasi'), (r'multidisiplin', 'lintas bidang ilmu'),
    (r'estimator', 'ukuran'), (r'prosedural', 'berurutan'), (r'pengodean', 'penulisan kode'),
    (r'terprogram', 'melalui kode program'), (r'mewujudkan', 'menerapkan'),
    # kata kiasan / terjemahan harfiah / bahasa brosur (aturan 6, tambahan)
    (r'lini masa', 'beranda'), (r'kartu', 'hapus: "artikel rujukan", "unggahan"'), (r'dua lapis', 'dua sumber'),
    (r'akar (masalah|permasalahan|kendala)', 'masalah / dasar permasalahan'), (r'sinyal', 'ciri'),
    (r'ruang digital', 'internet'), (r'jernih', 'jelas'), (r'menghadirkan', 'memberikan'),
    (r'kehadiran', 'hapus subjek abstrak ("Ekstensi ini ...")'), (r'arus pertukaran', 'ubah kalimat'),
    (r'fakta di lapangan', 'kondisi tersebut'), (r'satu langkah', 'hapus'), (r'tepat di samping', 'di samping'),
    (r'jalur (utama|cadangan)', 'sumber utama / sumber cadangan'),
    # ejaan (aturan 7)
    (r'antar-(komponen|objek)', 'antarkomponen / antarobjek'), (r'sub-tahap', 'subtahap'), (r'non-fungsional', 'nonfungsional'),
]

lines = open(sys.argv[1], encoding='utf-8').read().split('\n')
start = next(i for i, ln in enumerate(lines) if '\\begin{document}' in ln)
end = next((i for i, ln in enumerate(lines) if '\\chapter*{DAFTAR PUSTAKA}' in ln), len(lines))
found = 0
for i in range(start, end):
    text = re.sub(r'(?<!\\)%.*', '', lines[i])
    text = re.sub(r'\\[A-Za-z]+\*?', ' ', text)
    text = re.sub(r'[{}~]', ' ', text)
    for pat, fix in BANNED:
        for m in re.finditer(r'\b' + pat + r'\b', text, re.I):
            found += 1
            ctx = text[max(0, m.start() - 35):m.end() + 35].strip()
            print(f'baris {i + 1}: "{m.group(0)}" -> {fix}\n    ...{ctx}...')
print(f'\nHASIL: {"LOLOS, tidak ada kata terlarang." if not found else f"{found} temuan perlu diganti."}')
sys.exit(1 if found else 0)
