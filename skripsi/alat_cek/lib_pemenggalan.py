"""Fungsi bersama untuk pemeriksa spasi (cek_spasi.py) dan pembuat daftar pemenggalan (gen_pemenggalan.py)."""
import re

V = 'aeiou'
DIGRAPHS = ('ng', 'ny', 'sy', 'kh')
# Batas awalan/akhiran (PUEBI: me-rasa-kan, mem-bantu, makan-an) dan gugus awal kata serapan (pro-gram) dianggap sah.
PREFIXES = {'me', 'mem', 'men', 'meng', 'meny', 'pe', 'pem', 'pen', 'peng', 'peny', 'ber', 'per', 'ter', 'di', 'ke', 'se'}
SUFFIXES = {'an', 'kan', 'nya', 'lah', 'kah', 'pun'}
ONSETS = {'bl', 'br', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr', 'sp', 'st', 'sk', 'sl', 'sm', 'sn', 'sw',
          'str', 'spr', 'skr'}
LIQUID_ONSETS = {'bl', 'br', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr'}
WORD = r"[A-Za-z][A-Za-z'.\-]*[A-Za-z]|[A-Za-z]"


def _strip_cmds(text):
    for cmd in ('textit', 'texttt'):
        text = re.sub(r'\\' + cmd + r'\{((?:[^{}]|\{[^{}]*\})*)\}', ' ', text)
    # Awal paragraf, butir daftar, judul bagian, sel tabel, dan baris tabel dianggap awal kalimat.
    text = re.sub(r'\\(?:par|item|hline|noindent|babbaru|section|subsection|subsubsection|caption|tocsub|tocsubsub)\b', ' . ', text)
    text = re.sub(r'\\hspace\*?\{[^}]*\}', ' . ', text)
    text = text.replace('\\\\', ' . ').replace('&', ' . ')
    text = re.sub(r'\\[A-Za-z]+\*?(\[[^\]]*\])?', ' ', text)
    return re.sub(r'[{}$\\~]', ' ', text)


def load_words(tex_path):
    """Kembalikan (foreign, natural, indonesian).

    foreign    : kata asing/nama/kode/daftar pustaka yang tidak boleh dipenggal (huruf kecil)
    natural    : kata majemuk bertanda hubung asli di naskah (mis. real-time)
    indonesian : kata Indonesia biasa (teks tegak di luar daftar pustaka)
    """
    s = open(tex_path, encoding='utf-8').read()
    s = s[s.index('\\begin{document}'):]
    s = re.sub(r'(?<!\\)%.*', '', s)
    cut = s.find('\\chapter*{DAFTAR PUSTAKA}')
    body, refs = (s[:cut], s[cut:]) if cut > 0 else (s, '')
    foreign = set()
    for cmd in ('textit', 'texttt'):
        for m in re.finditer(r'\\' + cmd + r'\{((?:[^{}]|\{[^{}]*\})*)\}', body):
            for w in re.findall(WORD, m.group(1)):
                foreign.add(w.lower().strip('.-'))
    for w in re.findall(WORD, _strip_cmds(refs)):
        foreign.add(w.lower().strip('.-'))
    plain = _strip_cmds(body)
    toks = re.findall(r"[A-Za-z][A-Za-z'.\-]*|[.!?:]|\n\s*\n", plain)
    lower_seen = {t for t in toks if t[:1].islower()}
    prev = '.'
    for t in toks:
        if (t[0].isupper() and t[1:2].islower() and t not in '.!?:' and prev[-1:] not in ('.', '!', '?', ':')
                and not prev.startswith('\n')):
            if t.lower() not in lower_seen:
                foreign.add(t.lower().strip('.-'))
        prev = t
    # Singkatan huruf kapital (LSTM, BERT) tidak boleh dipenggal.
    for t in toks:
        if len(t) >= 4 and t.isalpha() and t.isupper():
            foreign.add(t.lower())
    # Kata yang juga tampil dalam huruf kecil pada teks tegak (bukan miring/kode/daftar pustaka) adalah kata Indonesia.
    lower_words = {t.lower().strip('.-') for t in toks if t[:1].islower()}
    foreign -= lower_words
    plain_words = {t.lower().strip('.-') for t in re.findall(WORD, plain)}
    indonesian = {w for w in plain_words if w not in foreign}
    natural = {m.group(0).lower() for m in re.finditer(r'[A-Za-z]+(?:-[A-Za-z]+)+', body + refs)}
    return foreign, natural, indonesian


def units(w):
    out, i = [], 0
    while i < len(w):
        if w[i] in V:
            out.append(w[i])
            i += 1
        elif w[i:i + 2] in DIGRAPHS:
            out.append(w[i:i + 2])
            i += 2
        else:
            out.append(w[i])
            i += 1
    return out


def syllable_breaks(w, lo=2):
    """Posisi pemenggalan menurut suku kata (PUEBI): V-V, V-CV, VC-CV; ai/au/oi tidak dipisah."""
    u = units(w)
    pos = [0]
    for t in u:
        pos.append(pos[-1] + len(t))
    vi = [i for i, t in enumerate(u) if t in V]
    br = set()
    for a, b in zip(vi, vi[1:]):
        k = b - a - 1
        if k == 0:
            if u[a] + u[b] in ('ai', 'au', 'oi'):
                continue
            idx = b
        elif k == 1:
            idx = a + 1
        elif k == 2 and u[a + 1] + u[a + 2] in LIQUID_ONSETS:
            idx = a + 1  # pro-gram, di-ple-set: gugus henti+cairan tetap utuh (KBBI)
        else:
            idx = a + 2
        br.add(pos[idx])
    return sorted(p for p in br if lo <= p <= len(w) - lo)


def hyphenated(w, lo=2):
    cuts = syllable_breaks(w, lo)
    out, last = '', 0
    for c in cuts:
        out += w[last:c] + '-'
        last = c
    return out + w[last:]
