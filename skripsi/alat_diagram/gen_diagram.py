"""Generator diagram skripsi (gaya draw.io, monokrom, istilah Inggris miring).

Sintaks teks: *kata* = miring. Ukuran huruf dipilih agar setelah diskalakan
selebar area teks (~396 pt) tinggi huruf tercetak >= 9 pt.
"""
import re
import sys
from pathlib import Path

OUT = Path(sys.argv[1])

MARKER = (
    '<defs><marker id="classic" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
    'markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 L 2.3 5 Z" '
    'fill="#000000" stroke="#000000" stroke-width="0.8"/></marker></defs>'
)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def rich(s):
    parts = re.split(r"(\*[^*]+\*)", s)
    out = []
    for p in parts:
        if not p:
            continue
        if p.startswith("*") and p.endswith("*"):
            out.append(f'<tspan font-style="italic">{esc(p[1:-1])}</tspan>')
        else:
            out.append(esc(p))
    return "".join(out)


class Fig:
    def __init__(self, w):
        self.w = w
        self.items = []
        self.maxy = 0

    def rect(self, x, y, w, h, rx=0):
        r = f' rx="{rx}"' if rx else ""
        self.items.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}"{r} fill="#ffffff" stroke="#000000" stroke-width="1"/>'
        )
        self.maxy = max(self.maxy, y + h)

    def hline(self, x1, x2, y):
        self.items.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#000000" stroke-width="1"/>')

    def path(self, pts, end=True, start=False):
        d = " ".join(("M" if i == 0 else "L") + f" {x} {y}" for i, (x, y) in enumerate(pts))
        m = (' marker-end="url(#classic)"' if end else "") + (' marker-start="url(#classic)"' if start else "")
        self.items.append(f'<path d="{d}" fill="none" stroke="#000000" stroke-width="1"{m}/>')

    def arrow_down(self, x, y1, y2, both=False):
        self.path([(x, y1), (x, y2 - 1)], end=True, start=both)

    def text(self, x, y, s, size, bold=False, italic=False, anchor="middle"):
        a = f' font-size="{size}"'
        if bold:
            a += ' font-weight="bold"'
        if italic:
            a += ' font-style="italic"'
        if anchor != "start":
            a += f' text-anchor="{anchor}"'
        self.items.append(f'<text x="{x}" y="{y}"{a} fill="#000000">{rich(s)}</text>')

    def lines_block(self, cx, top, lines, pad=8, anchor="middle"):
        """lines: list of (text, size, bold). Returns block height incl. padding."""
        y = top + pad
        for t, size, bold in lines:
            lh = size * 1.32
            y += lh
            self.text(cx, round(y - lh * 0.27, 1), t, size, bold, anchor=anchor)
        return round(y + pad - top, 1)

    def box(self, x, y, w, lines, rx=0, pad=8, minh=0):
        h = self.measure(lines, pad)
        h = max(h, minh)
        self.rect(x, y, w, h, rx)
        off = (h - self.measure(lines, pad)) / 2
        self.lines_block(x + w / 2, y + off, lines, pad)
        return h

    @staticmethod
    def measure(lines, pad=8):
        return round(sum(s * 1.32 for _, s, _ in lines) + 2 * pad, 1)

    def container(self, x, y, w, h, title_lines):
        # Kontainer adalah latar: disisipkan di awal agar tidak menutupi isinya.
        th = self.measure(title_lines, 6)
        n0 = len(self.items)
        self.rect(x, y, w, h)
        self.hline(x, x + w, y + th)
        self.lines_block(x + w / 2, y, title_lines, 6)
        new = self.items[n0:]
        del self.items[n0:]
        self.items[0:0] = new
        return th

    def save(self, name, pad_bottom=8):
        H = round(self.maxy + pad_bottom)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {H}" width="{self.w}" height="{H}" '
            'style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#000000;">\n'
            f"  {MARKER}\n"
            f'  <rect x="0" y="0" width="{self.w}" height="{H}" fill="#ffffff"/>\n  '
            + "\n  ".join(self.items)
            + "\n</svg>\n"
        )
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(name, self.w, H)


# Ukuran huruf standar (W=500 -> skala ~0,79 -> 12,5=9,9pt; 12=9,5pt; 11,5=9,1pt)
T, B, N = 12.5, 12, 11.5


def metodologi():
    f = Fig(480)
    t, b, n = 13, 12.5, 12
    x, w, cx = 20, 440, 240
    y = 10
    h = f.box(x, y, w, [("Identifikasi Masalah", t, True)], rx=5)
    y += h
    f.arrow_down(cx, y, y + 24)
    y += 24
    # Pengumpulan Data
    cont_top = y
    inner = [
        [("Studi Pustaka", b, True)],
        [("Kuesioner", b, True)],
    ]
    th = Fig.measure([("Pengumpulan Data", t, True)], 6)
    by = cont_top + th + 14
    bw, bx1, bx2 = 180, 38, 262
    sp = [("Studi Pustaka", b, True), ("1. Jurnal Penelitian", n, False), ("2. Dokumentasi Teknis", n, False)]
    ks = [("Kuesioner", b, True), ("1. Survei 60 Responden", n, False), ("    Pengguna Threads", n, False)]
    bh = Fig.measure(sp)
    f.rect(bx1, by, bw, bh)
    f.rect(bx2, by, bw, bh)
    # judul tengah, butir rata kiri
    yy = by + 8
    for i, (txt, s, bold) in enumerate(sp):
        yy += s * 1.32
        if i == 0:
            f.text(bx1 + bw / 2, round(yy - s * 1.32 * 0.27, 1), txt, s, True)
        else:
            f.text(bx1 + 14, round(yy - s * 1.32 * 0.27, 1), txt, s, anchor="start")
    yy = by + 8
    for i, (txt, s, bold) in enumerate(ks):
        yy += s * 1.32
        if i == 0:
            f.text(bx2 + bw / 2, round(yy - s * 1.32 * 0.27, 1), txt, s, True)
        else:
            f.text(bx2 + 14, round(yy - s * 1.32 * 0.27, 1), txt.strip(), s, anchor="start") if i == 1 else f.text(
                bx2 + 30, round(yy - s * 1.32 * 0.27, 1), txt.strip(), s, anchor="start"
            )
    f.hline(bx1 + bw, bx2, round(by + bh / 2, 1))
    cont_h = round(by + bh + 14 - cont_top, 1)
    f.container(x, cont_top, w, cont_h, [("Pengumpulan Data", t, True)])
    y = cont_top + cont_h
    f.arrow_down(cx, y, y + 24)
    y += 24
    # Analisis dan Perancangan Sistem
    cont_top = y
    th = Fig.measure([("Analisis dan Perancangan Sistem", t, True)], 6)
    yy = cont_top + th + 14
    steps = ["Analisis Masalah", "Analisis Sistem yang Berjalan", "Analisis Kebutuhan Sistem", "Perancangan Sistem"]
    for i, s in enumerate(steps):
        h = f.box(60, yy, 360, [(s, b, True)])
        yy += h
        if i < len(steps) - 1:
            f.arrow_down(cx, yy, yy + 20)
            yy += 20
    cont_h = round(yy + 14 - cont_top, 1)
    f.container(x, cont_top, w, cont_h, [("Analisis dan Perancangan Sistem", t, True)])
    y = cont_top + cont_h
    f.arrow_down(cx, y, y + 24)
    y += 24
    h = f.box(x, y, w, [("Implementasi dan Pengujian", t, True)], rx=5)
    y += h
    f.arrow_down(cx, y, y + 24)
    y += 24
    f.box(x, y, w, [("*Output*: Ekstensi Google Chrome untuk Deteksi *Hoax* pada Threads", 12.5, True)], rx=5)
    f.save("metodologi_penelitian")


def waterfall():
    f = Fig(500)
    steps = [
        ("System Engineering", "(Rekayasa Sistem)"),
        ("System Analysis", "(Analisis Kebutuhan Sistem)"),
        ("System & Software Design", "(Perancangan Sistem)"),
        ("Implementation / Coding", "(Implementasi Kode)"),
        ("Testing / Verification", "(Pengujian Sistem)"),
        ("Maintenance", "(Pemeliharaan Sistem)"),
    ]
    bw, dx = 170, 62
    lines0 = [("x", B, True), ("x", N, False)]
    bh = Fig.measure(lines0)
    step_y = bh + 14
    for i, (en, idn) in enumerate(steps):
        x, y = 10 + dx * i, 10 + step_y * i
        f.box(x, y, bw, [(f"*{en}*", B, True), (idn, N, False)])
        if i < len(steps) - 1:
            ex = x + bw + 20
            f.path([(x + bw, round(y + bh / 2, 1)), (ex, round(y + bh / 2, 1)), (ex, y + step_y - 1)])
    f.save("metode_waterfall")


def system_engineering():
    f = Fig(500)
    title = [("Komponen Pembentuk Rekayasa Sistem (*System Engineering*)", T, True)]
    th = Fig.measure(title, 6)
    comps = [
        ("Perangkat Keras", "*(Hardware)*", ["Komputer Klien", "& *Server*"]),
        ("Perangkat Lunak", "*(Software)*", ["Ekstensi Chrome", "& REST API"]),
        ("Pengguna Sistem", "*(Brainware)*", ["Pengguna Media", "Sosial Threads"]),
        ("Data & Jaringan", "*(Data & Network)*", ["DOM, JSON, &", "Bukti *Web*"]),
    ]
    bw, gap, x0 = 110, 10, 15
    by = 8 + th + 12
    bh = 0
    centers = []
    for i, (a, b, cs) in enumerate(comps):
        x = x0 + i * (bw + gap)
        lines = [(a, B, True), (b, N, False)] + [(c, N, False) for c in cs]
        bh = f.box(x, by, bw, lines)
        centers.append(x + bw / 2)
    cont_h = round(by + bh + 12 - 8, 1)
    f.container(8, 8, 484, cont_h, title)
    my = round(8 + cont_h + 16, 1)
    for c in centers:
        f.path([(c, by + bh), (c, my)], end=False)
    f.path([(centers[0], my), (centers[-1], my)], end=False)
    y = my + 22
    f.arrow_down(250, my, y)
    h = f.box(
        30,
        y,
        440,
        [
            ("Perumusan Batas dan Integrasi Sistem Secara Menyeluruh", B, True),
            ("(Penyelarasan Alur Ekstensi *Browser*, *Server Backend*,", N, False),
            ("dan Pencarian *Real-Time*)", N, False),
        ],
    )
    y += h
    f.arrow_down(250, y, y + 22)
    y += 22
    f.box(
        30,
        y,
        440,
        [("Spesifikasi Arsitektur Tingkat Sistem", B, True), ("(Dasar Masukan bagi Tahap *System Analysis*)", N, False)],
        rx=5,
    )
    f.save("system_engineering")


def system_analysis():
    f = Fig(500)
    title = [("Tahapan Analisis Sistem (*System Analysis*)", T, True)]
    th = Fig.measure(title, 6)
    steps = [
        ("1. *Identify* (Identifikasi Masalah Sistem Berjalan)",
         ["Mengidentifikasi ketiadaan fitur cek fakta langsung", "pada halaman *web* Threads"]),
        ("2. *Understand* (Pemahaman Karakteristik Objek & Pengguna)",
         ["Mempelajari struktur DOM unggahan Threads dan", "hasil kuesioner 60 responden"]),
        ("3. *Analyze* (Analisis Kebutuhan & Mekanisme Verifikasi)",
         ["Menganalisis kebutuhan fungsional, normalisasi NFKC,", "dan penelusuran bukti *web*"]),
        ("4. *Report* (Penyusunan Spesifikasi Kebutuhan Sistem)",
         ["Merumuskan spesifikasi kebutuhan sebagai acuan", "perancangan UML dan antarmuka"]),
    ]
    y = 8 + th + 14
    for i, (a, subs) in enumerate(steps):
        h = f.box(24, y, 452, [(a, B, True)] + [(s, N, False) for s in subs])
        y += h
        if i < len(steps) - 1:
            f.arrow_down(250, y, y + 20)
            y += 20
    f.container(8, 8, 484, round(y + 14 - 8, 1), title)
    f.save("system_analysis")


def arsitektur():
    f = Fig(500)
    lanes = [(8, [("Sisi Klien", T, True), ("(Ekstensi Chrome)", T, True)]),
             (179, [("Sisi *Server*", T, True), ("(*Backend*)", T, True)]),
             (350, [("Sumber Pencarian", T, True), ("*Web*", T, True)])]
    lw, bw = 141, 125
    th = Fig.measure(lanes[0][1], 6)
    top = 8
    y0 = top + th + 14
    # Lajur 1: klien
    x1 = 8 + (lw - bw) / 2
    c1 = x1 + bw / 2
    l1 = [
        [("Halaman *Web*", B, True), ("Threads", B, True), ("(DOM Unggahan", N, False), ("& *Badge*)", N, False)],
        [("*Content Script*", B, True)],
        [("*Background*", B, True), ("*Service Worker*", B, True)],
        [("Antarmuka *Popup*", B, True)],
    ]
    y = y0
    pos1 = []
    for i, ls in enumerate(l1):
        h = f.box(x1, y, bw, ls)
        pos1.append((y, h))
        y += h
        if i < len(l1) - 1:
            f.arrow_down(c1, y, y + 22, both=True)
            f.items[-1] = f.items[-1].replace(f"L {c1} {y + 21}", f"L {c1} {y + 21}")
            y += 22
    bottom1 = y
    # Lajur 2: server
    x2 = 179 + (lw - bw) / 2
    c2 = x2 + bw / 2
    l2 = [
        [("Layanan REST API", B, True), ("(Validasi &", N, False), ("Normalisasi Teks)", N, False)],
        [("Modul", B, True), ("Penelusuran *Web*", B, True), ("(Kueri & Penyaringan", N, False), ("Bukti)", N, False)],
        [("Modul Penyusun", B, True), ("Hasil", B, True), ("(Status, Skor,", N, False), ("& Rujukan)", N, False)],
    ]
    y = y0
    pos2 = []
    for i, ls in enumerate(l2):
        h = f.box(x2, y, bw, ls)
        pos2.append((y, h))
        y += h
        if i < len(l2) - 1:
            f.arrow_down(c2, y, y + 22)
            y += 22
    bottom2 = y
    # Lajur 3: sumber web, sejajar dengan modul penelusuran
    x3 = 350 + (lw - bw) / 2
    s2y, s2h = pos2[1]
    s2m = s2y + s2h / 2
    aio = [("Google AI", B, True), ("Overview", B, True), ("(Jalur Utama)", N, False)]
    rss = [("Google News", B, True), ("RSS", B, True), ("(Jalur Cadangan)", N, False)]
    ah = Fig.measure(aio)
    ay = round(s2m - 12 - ah, 1)
    f.box(x3, ay, bw, aio)
    ry = round(s2m + 12, 1)
    rh = f.box(x3, ry, bw, rss)
    bottom = max(bottom1, bottom2, ry + rh) + 14
    for lx, tl in lanes:
        f.container(lx, top, lw, round(bottom - top, 1), tl)
    # Konektor ortogonal
    b3y, b3h = pos1[2]
    s1y, s1h = pos2[0]
    s3y, s3h = pos2[2]
    gx = (8 + lw + 179) / 2  # tengah celah lajur 1-2
    f.path([(x1 + bw, round(b3y + b3h / 2 - 7, 1)), (gx - 5, round(b3y + b3h / 2 - 7, 1)),
            (gx - 5, round(s1y + s1h / 2, 1)), (x2 - 1, round(s1y + s1h / 2, 1))])
    f.path([(x2, round(s3y + s3h / 2, 1)), (gx + 5, round(s3y + s3h / 2, 1)),
            (gx + 5, round(b3y + b3h / 2 + 7, 1)), (x1 + bw + 1, round(b3y + b3h / 2 + 7, 1))])
    gx2 = (179 + lw + 350) / 2
    f.path([(x2 + bw, round(s2m - 8, 1)), (gx2, round(s2m - 8, 1)), (gx2, round(ay + ah / 2, 1)),
            (x3 - 1, round(ay + ah / 2, 1))], start=True)
    f.path([(x2 + bw, round(s2m + 8, 1)), (gx2, round(s2m + 8, 1)), (gx2, round(ry + rh / 2, 1)),
            (x3 - 1, round(ry + rh / 2, 1))], start=True)
    f.save("arsitektur_umum")


for fn in (metodologi, waterfall, system_engineering, system_analysis, arsitektur):
    fn()
