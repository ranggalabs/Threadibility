"""Render gambar kerangka (wireframe) TikZ menjadi PNG tajam untuk naskah.
Pemakaian (dari folder ini): python render_wf.py w_badge w_popup w_konsol
Keluaran: ../revisi_bab1_bab2/gambar/<nama>.png dan lebar alaminya (pt) pada layar."""
import os, subprocess, sys
import pymupdf

tect = os.path.expanduser('~/.local/bin/tectonic.exe')
OUT = '../../revisi_bab1_bab2/gambar/'
for n in sys.argv[1:]:
    open(f'png_{n}.tex', 'w', encoding='utf-8').write(
        '\\documentclass[border=1pt]{standalone}\n'
        '\\usepackage{fontspec}\n\\setmainfont{Times New Roman}\n'
        '\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta,shapes.geometric}\n'
        '\\input{umlstyle}\n'
        '\\begin{document}\n\\input{fig_%s}\n\\end{document}\n' % n)
    r = subprocess.run([tect, '-X', 'compile', f'png_{n}.tex'], capture_output=True, text=True)
    errs = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith('error')]
    if errs:
        print(n, 'GALAT', errs[:3]); continue
    d = pymupdf.open(f'png_{n}.pdf')
    pg = d[0]
    pg.get_pixmap(dpi=400).save(OUT + n + '.png')
    print(n, 'lebar alami (pt):', round(pg.rect.width, 2), 'tinggi (pt):', round(pg.rect.height, 2))
